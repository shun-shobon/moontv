//! 字幕の画面（STD-B24 第1分冊第3部、TR-B14 第3巻 第4章）。

use std::collections::{BTreeMap, HashMap};

use serde::Serialize;

use super::code::{CharSize, Op};
use super::drcs::{DrcsSet, Pattern};
use super::tables;

const TRANSPARENT: u8 = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl Rect {
    const fn right(&self) -> i32 {
        self.x + self.width
    }

    const fn bottom(&self) -> i32 {
        self.y + self.height
    }
}

/// 表示書式と、それに伴う表示領域・文字の大きさ・字間・行間。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Layout {
    pub plane: (i32, i32),
    pub area: Rect,
    pub font: (i32, i32),
    pub h_space: i32,
    pub v_space: i32,
}

impl Layout {
    /// SWF の値ごとの既定値（TR-B14 第3巻 表 4-13、4-15）。運用されない書式は 960x540 横書きとして扱う。
    pub const fn for_swf(swf: u32) -> Self {
        let (plane, h_space, v_space) = match swf {
            5 => ((1920, 1080), 4, 24),
            8 => ((960, 540), 12, 24),
            9 => ((720, 480), 4, 16),
            10 => ((720, 480), 8, 24),
            11 => ((1280, 720), 4, 24),
            _ => ((960, 540), 4, 24),
        };
        Self {
            plane,
            area: Rect {
                x: 0,
                y: 0,
                width: plane.0,
                height: plane.1,
            },
            font: (36, 36),
            h_space,
            v_space,
        }
    }

    /// 字幕管理データの Format（STD-B24 表 9-7）は SWF とは値が異なる。
    pub const fn for_format(format: u8) -> Self {
        Self::for_swf(match format {
            0b0110 => 5,
            0b1001 => 8,
            0b1010 => 9,
            0b1011 => 10,
            0b1100 => 11,
            _ => 7,
        })
    }

    /// 字幕管理データの本文で書式や表示領域を変える。
    pub fn apply(&mut self, op: &Op) {
        let Op::Csi { final_byte, params } = op else {
            return;
        };
        let p = |i: usize| params.get(i).map(|&v| i32::try_from(v).unwrap_or(i32::MAX));
        match (final_byte, p(0), p(1)) {
            (b'S', Some(swf), _) => *self = Self::for_swf(swf.unsigned_abs()),
            (b'V', Some(w), Some(h)) => (self.area.width, self.area.height) = (w, h),
            (b'_', Some(x), Some(y)) => (self.area.x, self.area.y) = (x, y),
            (b'W', Some(w), Some(h)) => self.font = (w, h),
            (b'X', Some(s), _) => self.h_space = s,
            (b'Y', Some(s), _) => self.v_space = s,
            _ => {}
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Style {
    fg: u8,
    bg: u8,
    edge: Option<u8>,
    flash: bool,
    underline: bool,
    highlight: u8,
}

#[derive(Debug, Clone, Copy)]
struct Pen {
    size: CharSize,
    palette: u8,
    style: Style,
}

/// STD-B24 第3部 表 8-2 の初期状態。
const INITIAL_PEN: Pen = Pen {
    size: CharSize::Normal,
    palette: 0,
    style: Style {
        fg: 7,
        bg: TRANSPARENT,
        edge: None,
        flash: false,
        underline: false,
        highlight: 0,
    },
};

#[derive(Debug, Clone, PartialEq, Eq)]
enum Glyph {
    Char(char),
    Bitmap([u8; 16]),
}

/// 表示区画1つ。`x` と `top` は区画の左上。
#[derive(Debug, Clone, PartialEq, Eq)]
struct Cell {
    x: i32,
    top: i32,
    metrics: Metrics,
    glyph: Glyph,
    style: Style,
}

/// 表示区画と文字の大きさ。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Metrics {
    cell_width: i32,
    cell_height: i32,
    font_width: i32,
    font_height: i32,
}

pub struct Screen {
    defaults: Layout,
    layout: Layout,
    pen: Pen,
    /// 動作位置。区画の左下を指す。表示領域が変わったら次の文字で初期位置に戻す。
    position: Option<(i32, i32)>,
    raster: u8,
    repeat: Option<u8>,
    cells: Vec<Cell>,
    bitmaps: HashMap<[u8; 16], Pattern>,
}

impl Screen {
    pub fn new(defaults: Layout) -> Self {
        Self {
            defaults,
            layout: defaults,
            pen: INITIAL_PEN,
            position: None,
            raster: TRANSPARENT,
            repeat: None,
            cells: Vec::new(),
            bitmaps: HashMap::new(),
        }
    }

    /// 本文データユニットの先頭、CS、SWF での初期化。表示している文字は残す。
    pub const fn reset_state(&mut self) {
        self.layout = self.defaults;
        self.pen = INITIAL_PEN;
        self.position = None;
        self.repeat = None;
    }

    pub fn apply(&mut self, op: &Op, drcs: &DrcsSet) {
        match op {
            Op::Char(c) => self.put_char(*c),
            Op::Space => self.put_char('\u{3000}'),
            Op::Del => self.put_char('\u{2588}'),
            Op::Drcs(code) => self.put_drcs(*code, drcs),
            Op::Apf => self.forward(),
            Op::Papf(n) => (0..*n).for_each(|_| self.forward()),
            Op::Apb => self.backward(),
            Op::Apd => self.down(),
            Op::Apu => self.up(),
            Op::Apr => {
                let (_, y) = self.position();
                self.position = Some((self.layout.area.x, y));
                self.down();
            }
            Op::Aps { row, column } => {
                let m = self.metrics();
                let area = self.layout.area;
                self.position = Some((
                    area.x + i32::from(*column) * m.cell_width,
                    area.y + (i32::from(*row) + 1) * m.cell_height,
                ));
            }
            Op::Cs => {
                self.cells.clear();
                self.bitmaps.clear();
                self.raster = TRANSPARENT;
                self.reset_state();
            }
            Op::Foreground(c) => self.pen.style.fg = self.color(*c),
            Op::Background(c) => self.pen.style.bg = self.color(*c),
            Op::Palette(p) => self.pen.palette = *p,
            Op::Size(size) => self.pen.size = *size,
            Op::Flash(p) => self.pen.style.flash = *p != 0x4f,
            Op::Highlight(bits) => self.pen.style.highlight = *bits,
            Op::Underline(on) => self.pen.style.underline = *on,
            Op::Repeat(n) => self.repeat = Some(*n),
            Op::Csi { final_byte, params } => self.csi(*final_byte, params),
            Op::HalfForeground(_) | Op::HalfBackground(_) | Op::Wait(_) => {}
        }
    }

    const fn color(&self, cmla: u8) -> u8 {
        (self.pen.palette << 4) | cmla
    }

    fn csi(&mut self, final_byte: u8, params: &[u32]) {
        match final_byte {
            b'S' => {
                self.layout.apply(&Op::Csi {
                    final_byte,
                    params: params.to_vec(),
                });
                self.pen = INITIAL_PEN;
                self.position = None;
            }
            b'V' | b'_' | b'W' | b'X' | b'Y' => {
                self.layout.apply(&Op::Csi {
                    final_byte,
                    params: params.to_vec(),
                });
                if matches!(final_byte, b'V' | b'_') {
                    self.position = None;
                }
            }
            // ACPS は論理プレーン上の区画の左下の座標を指す。
            b'a' => {
                if let [x, y, ..] = *params {
                    self.position = Some((
                        i32::try_from(x).unwrap_or(i32::MAX),
                        i32::try_from(y).unwrap_or(i32::MAX),
                    ));
                }
            }
            b'n' => {
                if let Some(&c) = params.first() {
                    self.raster = u8::try_from(c).unwrap_or(TRANSPARENT);
                }
            }
            // ORN の色は「パレット番号 2 桁と色番号 2 桁」の 4 桁で来る。
            b'c' => {
                self.pen.style.edge = match *params {
                    [1, color, ..] => u8::try_from((color / 100) * 16 + color % 100).ok(),
                    _ => None,
                };
            }
            _ => {}
        }
    }

    const fn metrics(&self) -> Metrics {
        // 倍率を 2 倍した値で計算し、中型・小型の半分を整数で扱う。
        let (sx, sy) = match self.pen.size {
            CharSize::Small | CharSize::Tiny => (1, 1),
            CharSize::Middle => (1, 2),
            CharSize::Normal => (2, 2),
            CharSize::DoubleHeight => (2, 4),
            CharSize::DoubleWidth => (4, 2),
            CharSize::DoubleSize => (4, 4),
        };
        let l = &self.layout;
        Metrics {
            cell_width: (l.font.0 + l.h_space) * sx / 2,
            cell_height: (l.font.1 + l.v_space) * sy / 2,
            font_width: l.font.0 * sx / 2,
            font_height: l.font.1 * sy / 2,
        }
    }

    fn position(&self) -> (i32, i32) {
        self.position.unwrap_or_else(|| {
            let area = self.layout.area;
            (area.x, area.y + self.metrics().cell_height)
        })
    }

    fn forward(&mut self) {
        let (x, y) = self.position();
        let width = self.metrics().cell_width;
        if x + width >= self.layout.area.right() {
            self.position = Some((self.layout.area.x, y));
            self.down();
        } else {
            self.position = Some((x + width, y));
        }
    }

    fn backward(&mut self) {
        let (x, y) = self.position();
        let width = self.metrics().cell_width;
        if x - width < self.layout.area.x {
            self.position = Some((self.layout.area.right() - width, y));
            self.up();
        } else {
            self.position = Some((x - width, y));
        }
    }

    fn down(&mut self) {
        let (x, y) = self.position();
        let height = self.metrics().cell_height;
        let area = self.layout.area;
        let next = if y + height > area.bottom() {
            area.y + height
        } else {
            y + height
        };
        self.position = Some((x, next));
    }

    fn up(&mut self) {
        let (x, y) = self.position();
        let height = self.metrics().cell_height;
        let area = self.layout.area;
        let next = if y - 2 * height < area.y {
            area.y + area.height / height * height
        } else {
            y - height
        };
        self.position = Some((x, next));
    }

    fn put_char(&mut self, c: char) {
        // 中型には半角の字形を使う。全角の字形を横に縮めるより読みやすい。
        let c = if self.pen.size == CharSize::Middle {
            tables::halfwidth(c).unwrap_or(c)
        } else {
            c
        };
        self.put(&Glyph::Char(c));
    }

    fn put_drcs(&mut self, code: u16, drcs: &DrcsSet) {
        let m = self.metrics();
        let Some(pattern) = drcs.get(code, m.font_width.unsigned_abs(), m.font_height.unsigned_abs()) else {
            return self.put_char('〓');
        };
        if let Some(c) = pattern.replacement() {
            return self.put_char(c);
        }
        self.bitmaps.insert(pattern.digest, pattern.clone());
        self.put(&Glyph::Bitmap(pattern.digest));
    }

    fn put(&mut self, glyph: &Glyph) {
        let m = self.metrics();
        let count = match self.repeat.take() {
            None => 1,
            // RPC 04/0 は行末まで繰り返す。
            Some(0) => ((self.layout.area.right() - self.position().0) / m.cell_width.max(1)).max(1),
            Some(n) => i32::from(n),
        };
        for _ in 0..count {
            let (mut x, mut y) = self.position();
            let area = self.layout.area;
            // 区画が表示領域の右端を越えるなら、改行してから置く。
            if x + m.cell_width > area.right() {
                x = area.x;
                y = if y + m.cell_height > area.bottom() {
                    area.y + m.cell_height
                } else {
                    y + m.cell_height
                };
            }
            let cell = Cell {
                x,
                top: y - m.cell_height,
                metrics: m,
                glyph: glyph.clone(),
                style: self.pen.style,
            };
            self.cells.retain(|c| (c.x, c.top) != (cell.x, cell.top));
            self.cells.push(cell);
            self.position = Some((x + m.cell_width, y));
        }
    }

    pub fn snapshot(&self) -> Snapshot {
        let mut cells: Vec<&Cell> = self.cells.iter().collect();
        cells.sort_by_key(|c| (c.top, c.x));
        let mut runs: Vec<Run> = Vec::new();
        let mut bitmaps = BTreeMap::new();
        for cell in cells {
            let (text, bitmap) = match &cell.glyph {
                Glyph::Char(c) => (Some(*c), None),
                Glyph::Bitmap(digest) => {
                    let key = hex(digest);
                    if let Some(p) = self.bitmaps.get(digest) {
                        bitmaps.entry(key.clone()).or_insert_with(|| Bitmap::from(p));
                    }
                    (None, Some(key))
                }
            };
            if let (Some(c), Some(last)) = (text, runs.last_mut())
                && last.bitmap.is_none()
                && last.y == cell.top
                && last.x + last.cell_width * i32::try_from(last.text.chars().count()).unwrap_or(i32::MAX) == cell.x
                && (last.cell_width, last.cell_height, last.font_width, last.font_height)
                    == (
                        cell.metrics.cell_width,
                        cell.metrics.cell_height,
                        cell.metrics.font_width,
                        cell.metrics.font_height,
                    )
                && last.style == cell.style
            {
                last.text.push(c);
                continue;
            }
            runs.push(Run {
                x: cell.x,
                y: cell.top,
                cell_width: cell.metrics.cell_width,
                cell_height: cell.metrics.cell_height,
                font_width: cell.metrics.font_width,
                font_height: cell.metrics.font_height,
                text: text.map(String::from).unwrap_or_default(),
                bitmap,
                style: cell.style,
            });
        }
        let area = self.layout.area;
        Snapshot {
            plane: self.layout.plane.into(),
            raster: (self.raster != TRANSPARENT && !runs.is_empty()).then(|| Raster {
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
                color: rgba(self.raster),
            }),
            runs: runs.into_iter().map(RunDto::from).collect(),
            bitmaps,
        }
    }
}

struct Run {
    x: i32,
    y: i32,
    cell_width: i32,
    cell_height: i32,
    font_width: i32,
    font_height: i32,
    text: String,
    bitmap: Option<String>,
    style: Style,
}

/// 画面全体の状態。字幕文を処理するたびにこれを丸ごと送り、途中から見始めても今の字幕を出せるようにする。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Snapshot {
    /// 座標の基準になる字幕プレーンの大きさ。映像の表示領域いっぱいに拡大して重ねる。
    pub plane: [i32; 2],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raster: Option<Raster>,
    pub runs: Vec<RunDto>,
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub bitmaps: BTreeMap<String, Bitmap>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Raster {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub color: String,
}

/// 同じ行・同じ見た目で並ぶ区画。`x`・`y` は先頭の区画の左上で、文字は区画の幅ずつ右に並ぶ。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunDto {
    pub x: i32,
    pub y: i32,
    pub cell_width: i32,
    pub cell_height: i32,
    pub font_width: i32,
    pub font_height: i32,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub text: String,
    /// 置き換えられなかった DRCS。`Snapshot::bitmaps` のキー。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bitmap: Option<String>,
    pub fg: String,
    pub bg: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edge: Option<String>,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub flash: bool,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub underline: bool,
    /// HLC の囲み。ビット 0 から順に下・右・上・左の辺。
    #[serde(skip_serializing_if = "is_zero")]
    pub highlight: u8,
}

#[expect(
    clippy::trivially_copy_pass_by_ref,
    reason = "serde の skip_serializing_if は参照を渡す"
)]
const fn is_zero(v: &u8) -> bool {
    *v == 0
}

impl From<Run> for RunDto {
    fn from(run: Run) -> Self {
        Self {
            x: run.x,
            y: run.y,
            cell_width: run.cell_width,
            cell_height: run.cell_height,
            font_width: run.font_width,
            font_height: run.font_height,
            text: run.text,
            bitmap: run.bitmap,
            fg: rgba(run.style.fg),
            bg: rgba(run.style.bg),
            edge: run.style.edge.map(rgba),
            flash: run.style.flash,
            underline: run.style.underline,
            highlight: run.style.highlight,
        }
    }
}

/// DRCS のビットマップ。`pixels` は画素ごとの階調を 1 桁の数字で並べたもの。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Bitmap {
    pub width: u8,
    pub height: u8,
    pub levels: u8,
    pub pixels: String,
}

impl From<&Pattern> for Bitmap {
    fn from(p: &Pattern) -> Self {
        Self {
            width: p.width,
            height: p.height,
            levels: p.levels,
            pixels: p
                .pixels
                .iter()
                .map(|&v| char::from_digit(u32::from(v), 10).unwrap_or('0'))
                .collect(),
        }
    }
}

fn hex(bytes: &[u8]) -> String {
    use std::fmt::Write;
    bytes.iter().fold(String::new(), |mut s, b| {
        let _ = write!(s, "{b:02x}");
        s
    })
}

/// 受信機共通固定色（TR-B14 第3巻 付録1）の `#rrggbbaa`。
fn rgba(index: u8) -> String {
    let [r, g, b, a] = CLUT[usize::from(index & 0x7f)];
    format!("#{r:02x}{g:02x}{b:02x}{a:02x}")
}

/// 0〜7 は原色、8 は透明、9〜15 は半輝度、16〜64 は残りの {0,85,170,255} の組み合わせ、65〜127 はそれらの半透明。
const CLUT: [[u8; 4]; 128] = clut();

const fn clut() -> [[u8; 4]; 128] {
    const fn primary(bits: u8, level: u8) -> [u8; 4] {
        const fn on(bits: u8, bit: u8, level: u8) -> u8 {
            if bits & bit != 0 { level } else { 0 }
        }
        [on(bits, 1, level), on(bits, 2, level), on(bits, 4, level), 255]
    }
    const LEVELS: [u8; 4] = [0, 85, 170, 255];
    let mut table = [[0; 4]; 128];
    let mut bits: u8 = 0;
    while bits < 8 {
        table[bits as usize] = primary(bits, 255);
        if bits > 0 {
            table[bits as usize + 8] = primary(bits, 170);
        }
        bits += 1;
    }
    let mut next = 16;
    let mut combination = 0;
    while combination < 64 {
        let color = [
            LEVELS[combination / 16],
            LEVELS[combination / 4 % 4],
            LEVELS[combination % 4],
            255,
        ];
        let mut used = false;
        let mut index = 0;
        while index < 16 {
            if index != 8 && table[index][0] == color[0] && table[index][1] == color[1] && table[index][2] == color[2] {
                used = true;
            }
            index += 1;
        }
        if !used {
            table[next] = color;
            next += 1;
        }
        combination += 1;
    }
    let mut source = 0;
    let mut target = 65;
    while target < 128 {
        if source != 8 {
            let [red, green, blue, _] = table[source];
            table[target] = [red, green, blue, 128];
            target += 1;
        }
        source += 1;
    }
    table
}

#[cfg(test)]
mod tests {
    use super::*;

    fn screen() -> Screen {
        Screen::new(Layout::for_swf(7))
    }

    fn apply(screen: &mut Screen, ops: &[Op]) {
        let drcs = DrcsSet::default();
        for op in ops {
            screen.apply(op, &drcs);
        }
    }

    fn csi(final_byte: u8, params: &[u32]) -> Op {
        Op::Csi {
            final_byte,
            params: params.to_vec(),
        }
    }

    #[test]
    fn clut_matches_the_receiver_common_colors() {
        assert_eq!(CLUT[7], [255, 255, 255, 255]);
        assert_eq!(CLUT[8], [0, 0, 0, 0]);
        assert_eq!(CLUT[15], [170, 170, 170, 255]);
        assert_eq!(CLUT[16], [0, 0, 85, 255]);
        assert_eq!(CLUT[30], [85, 85, 85, 255]);
        assert_eq!(CLUT[64], [255, 255, 170, 255]);
        assert_eq!(CLUT[65], [0, 0, 0, 128]);
        assert_eq!(CLUT[127], [255, 255, 85, 128]);
    }

    #[test]
    fn places_characters_from_the_position_given_by_aps() {
        let mut s = screen();
        apply(
            &mut s,
            &[
                Op::Aps { row: 1, column: 2 },
                Op::Foreground(6),
                Op::Char('あ'),
                Op::Char('い'),
            ],
        );
        let snapshot = s.snapshot();
        assert_eq!(snapshot.plane, [960, 540]);
        let run = &snapshot.runs[0];
        // 区画は 40x60。2行目の3桁目。
        assert_eq!((run.x, run.y, run.cell_width, run.cell_height), (80, 60, 40, 60));
        assert_eq!(run.text, "あい");
        assert_eq!(run.fg, "#00ffffff");
        assert_eq!(run.bg, "#00000000");
    }

    #[test]
    fn middle_size_halves_the_width_and_uses_halfwidth_glyphs() {
        let mut s = screen();
        apply(&mut s, &[Op::Size(CharSize::Middle), Op::Char('Ａ'), Op::Char('。')]);
        let run = &s.snapshot().runs[0];
        assert_eq!((run.cell_width, run.font_width, run.font_height), (20, 18, 36));
        assert_eq!(run.text, "A｡");
    }

    #[test]
    fn palette_applies_to_colors_given_after_it() {
        let mut s = screen();
        apply(
            &mut s,
            &[Op::Foreground(6), Op::Palette(4), Op::Background(1), Op::Char('あ')],
        );
        let run = &s.snapshot().runs[0];
        assert_eq!(run.fg, "#00ffffff");
        assert_eq!(run.bg, "#00000080");
    }

    #[test]
    fn uses_the_display_area_and_absolute_positions() {
        let mut s = screen();
        apply(
            &mut s,
            &[
                csi(b'_', &[170, 30]),
                csi(b'V', &[610, 470]),
                csi(b'Y', &[16]),
                Op::Char('あ'),
                csi(b'a', &[170, 134]),
                Op::Char('い'),
            ],
        );
        let runs = s.snapshot().runs;
        assert_eq!((runs[0].x, runs[0].y), (170, 30));
        assert_eq!((runs[1].x, runs[1].y), (170, 82));
    }

    #[test]
    fn wraps_at_the_right_edge_of_the_area() {
        let mut s = screen();
        apply(&mut s, &[csi(b'V', &[80, 540])]);
        apply(&mut s, &[Op::Char('あ'), Op::Char('い'), Op::Char('う')]);
        let runs = s.snapshot().runs;
        assert_eq!(runs.len(), 2);
        assert_eq!((runs[1].x, runs[1].y, runs[1].text.as_str()), (0, 60, "う"));
    }

    #[test]
    fn clear_screen_removes_everything() {
        let mut s = screen();
        apply(&mut s, &[Op::Char('あ'), Op::Cs]);
        assert_eq!(s.snapshot().runs, Vec::new());
    }

    #[test]
    fn reads_the_edge_color_of_orn() {
        let mut s = screen();
        apply(&mut s, &[csi(b'c', &[1, 7]), Op::Char('あ')]);
        assert_eq!(s.snapshot().runs[0].edge.as_deref(), Some("#ffffffff"));
    }

    #[test]
    fn repeats_a_character() {
        let mut s = screen();
        apply(&mut s, &[Op::Repeat(3), Op::Char('ー')]);
        assert_eq!(s.snapshot().runs[0].text, "ーーー");
    }
}
