//! 8単位符号（STD-B24 第1分冊第2部 7.1）の解読。

use super::tables;

/// 図形集合（STD-B24 表 7-3）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CodeSet {
    Kanji,
    Alnum,
    Hiragana,
    Katakana,
    Mosaic,
    JisX0201Katakana,
    /// JIS X 0213 の1面。1〜84区は漢字系集合と同じ字として扱う。
    JisKanji1,
    JisKanji2,
    Symbol,
    Macro,
    Drcs(u8),
    Unknown {
        two_bytes: bool,
    },
}

impl CodeSet {
    const fn two_bytes(self) -> bool {
        match self {
            Self::Kanji | Self::JisKanji1 | Self::JisKanji2 | Self::Symbol | Self::Drcs(0) => true,
            Self::Unknown { two_bytes } => two_bytes,
            _ => false,
        }
    }

    const fn graphic(final_byte: u8, two_bytes: bool) -> Self {
        match (final_byte, two_bytes) {
            (0x42, true) => Self::Kanji,
            (0x39, true) => Self::JisKanji1,
            (0x3a, true) => Self::JisKanji2,
            (0x3b, true) => Self::Symbol,
            (0x4a | 0x36, false) => Self::Alnum,
            (0x30 | 0x37, false) => Self::Hiragana,
            (0x31 | 0x38, false) => Self::Katakana,
            (0x32..=0x35, false) => Self::Mosaic,
            (0x49, false) => Self::JisX0201Katakana,
            _ => Self::Unknown { two_bytes },
        }
    }

    /// 中間の 0x20 付きで指示する集合。F の値は G 集合と重なる。
    const fn drcs(final_byte: u8, two_bytes: bool) -> Self {
        match (final_byte, two_bytes) {
            (0x40, true) => Self::Drcs(0),
            (0x41..=0x4f, false) => Self::Drcs(final_byte - 0x40),
            (0x70, false) => Self::Macro,
            _ => Self::Unknown { two_bytes },
        }
    }
}

/// 文字の大きさ（STD-B24 第2部 表 7-15、第3部 5.3）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CharSize {
    Small,
    Middle,
    Normal,
    Tiny,
    DoubleHeight,
    DoubleWidth,
    DoubleSize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Op {
    /// 英数も全角の字形で返す。
    Char(char),
    /// `code` は DRCS データユニットの `CharacterCode` と同じ形。
    Drcs(u16),
    Space,
    /// DEL。文字区画を前景色で塗る。
    Del,
    Apb,
    Apf,
    Apd,
    Apu,
    Apr,
    Papf(u8),
    Aps {
        row: u8,
        column: u8,
    },
    Cs,
    Foreground(u8),
    Background(u8),
    HalfForeground(u8),
    HalfBackground(u8),
    Palette(u8),
    Size(CharSize),
    Flash(u8),
    Highlight(u8),
    Underline(bool),
    Repeat(u8),
    Wait(u8),
    Csi {
        final_byte: u8,
        params: Vec<u32>,
    },
}

/// マクロの展開が自分自身を呼んでも止まるようにする深さ。
const MACRO_DEPTH: u8 = 4;

pub struct Decoder {
    g: [CodeSet; 4],
    gl: usize,
    gr: usize,
    macros: Vec<Option<Vec<u8>>>,
}

impl Decoder {
    pub fn new() -> Self {
        let mut decoder = Self {
            g: [CodeSet::Kanji; 4],
            gl: 0,
            gr: 2,
            macros: vec![None; 94],
        };
        decoder.reset_codes();
        decoder
    }

    /// 本文データユニットの先頭で、指示と呼び出しを初期状態に戻す（STD-B24 第3部 表 8-1、8-2）。
    pub const fn reset_codes(&mut self) {
        self.g = [CodeSet::Kanji, CodeSet::Alnum, CodeSet::Hiragana, CodeSet::Macro];
        self.gl = 0;
        self.gr = 2;
    }

    pub fn reset_macros(&mut self) {
        self.macros.fill(None);
    }

    pub fn decode(&mut self, bytes: &[u8], out: &mut Vec<Op>) {
        self.run(bytes, out, 0);
    }

    #[expect(
        clippy::too_many_lines,
        reason = "符号表の順に分岐を並べたほうが仕様と照らし合わせやすい"
    )]
    fn run(&mut self, bytes: &[u8], out: &mut Vec<Op>, depth: u8) {
        let mut r = Bytes { data: bytes, pos: 0 };
        let mut single_shift: Option<usize> = None;
        while let Some(b) = r.next() {
            match b {
                0x08 => out.push(Op::Apb),
                0x09 => out.push(Op::Apf),
                0x0a => out.push(Op::Apd),
                0x0b => out.push(Op::Apu),
                0x0c => out.push(Op::Cs),
                0x0d => out.push(Op::Apr),
                0x0e => self.gl = 1,
                0x0f => self.gl = 0,
                0x16 => {
                    if let Some(p) = r.next() {
                        out.push(Op::Papf(p & 0x3f));
                    }
                }
                0x19 => single_shift = Some(2),
                0x1b => self.escape(&mut r),
                0x1c => {
                    if let (Some(row), Some(column)) = (r.next(), r.next()) {
                        out.push(Op::Aps {
                            row: row & 0x3f,
                            column: column & 0x3f,
                        });
                    }
                }
                0x1d => single_shift = Some(3),
                0x20 => out.push(Op::Space),
                0x7f => out.push(Op::Del),
                0x21..=0x7e => {
                    let set = self.g[single_shift.take().unwrap_or(self.gl)];
                    self.graphic(set, b, &mut r, out, depth);
                }
                0x80..=0x87 => out.push(Op::Foreground(b - 0x80)),
                0x88 => out.push(Op::Size(CharSize::Small)),
                0x89 => out.push(Op::Size(CharSize::Middle)),
                0x8a => out.push(Op::Size(CharSize::Normal)),
                0x8b => match r.next() {
                    Some(0x60) => out.push(Op::Size(CharSize::Tiny)),
                    Some(0x41) => out.push(Op::Size(CharSize::DoubleHeight)),
                    Some(0x44) => out.push(Op::Size(CharSize::DoubleWidth)),
                    Some(0x45) => out.push(Op::Size(CharSize::DoubleSize)),
                    _ => {}
                },
                0x90 => match r.next() {
                    Some(0x20) => {
                        if let Some(p) = r.next() {
                            out.push(Op::Palette(p & 0x0f));
                        }
                    }
                    Some(p @ 0x40..=0x4f) => out.push(Op::Foreground(p & 0x0f)),
                    Some(p @ 0x50..=0x5f) => out.push(Op::Background(p & 0x0f)),
                    Some(p @ 0x60..=0x6f) => out.push(Op::HalfForeground(p & 0x0f)),
                    Some(p @ 0x70..=0x7f) => out.push(Op::HalfBackground(p & 0x0f)),
                    _ => {}
                },
                0x91 => {
                    if let Some(p) = r.next() {
                        out.push(Op::Flash(p));
                    }
                }
                0x92 => {
                    // CDC は字幕では使わないので読み飛ばす。
                    if r.next() == Some(0x20) {
                        r.next();
                    }
                }
                0x93 | 0x94 => {
                    // POL と WMM は字幕で使う例がないので読み飛ばす。
                    r.next();
                }
                0x95 => self.macro_definition(&mut r),
                0x97 => {
                    if let Some(p) = r.next() {
                        out.push(Op::Highlight(p & 0x0f));
                    }
                }
                0x98 => {
                    if let Some(p) = r.next() {
                        out.push(Op::Repeat(p & 0x3f));
                    }
                }
                0x99 => out.push(Op::Underline(false)),
                0x9a => out.push(Op::Underline(true)),
                0x9b => {
                    if let Some(op) = csi(&mut r) {
                        out.push(op);
                    }
                }
                0x9d => match r.next() {
                    Some(0x20) => {
                        if let Some(p) = r.next() {
                            out.push(Op::Wait(p & 0x3f));
                        }
                    }
                    Some(0x28) => {
                        r.next();
                    }
                    Some(0x29) => while r.next().is_some_and(|c| c < 0x40) {},
                    _ => {}
                },
                0xa1..=0xfe => {
                    let set = self.g[self.gr];
                    self.graphic(set, b & 0x7f, &mut r, out, depth);
                }
                // NUL、BEL、CAN、RS、US と、字幕で使わない C1、0xA0、0xFF。
                _ => {}
            }
        }
    }

    fn graphic(&mut self, set: CodeSet, first: u8, r: &mut Bytes<'_>, out: &mut Vec<Op>, depth: u8) {
        let code = if set.two_bytes() {
            let Some(second) = r.next() else {
                return;
            };
            u16::from_be_bytes([first, second & 0x7f])
        } else {
            u16::from(first)
        };
        let [high, low] = code.to_be_bytes();
        let c = match set {
            CodeSet::Kanji | CodeSet::JisKanji1 | CodeSet::Symbol => tables::kanji(high - 0x20, low - 0x20),
            CodeSet::Alnum => tables::alnum(low),
            CodeSet::Hiragana => tables::hiragana(low),
            CodeSet::Katakana => tables::katakana(low),
            CodeSet::JisX0201Katakana => tables::jis_x0201_katakana(low),
            CodeSet::Drcs(0) => return out.push(Op::Drcs(code)),
            CodeSet::Drcs(n) => return out.push(Op::Drcs(u16::from_be_bytes([0x40 + n, low]))),
            CodeSet::Macro => return self.expand_macro(low, out, depth),
            CodeSet::JisKanji2 | CodeSet::Mosaic | CodeSet::Unknown { .. } => None,
        };
        // 表にない文字は、文字がそこにあったことが分かるよう下駄記号にする。
        out.push(Op::Char(c.unwrap_or('〓')));
    }

    fn expand_macro(&mut self, code: u8, out: &mut Vec<Op>, depth: u8) {
        if depth >= MACRO_DEPTH {
            return;
        }
        let index = usize::from(code - 0x21);
        if let Some(body) = self.macros[index].clone() {
            self.run(&body, out, depth + 1);
        } else if let 0x60..=0x6f = code {
            self.run(tables::DEFAULT_MACROS[usize::from(code - 0x60)], out, depth + 1);
        }
    }

    fn macro_definition(&mut self, r: &mut Bytes<'_>) {
        let Some(mode) = r.next() else {
            return;
        };
        if mode != 0x40 && mode != 0x41 {
            return;
        }
        let Some(code @ 0x21..=0x7e) = r.next() else {
            return;
        };
        let start = r.pos;
        while let Some(b) = r.next() {
            if b == 0x95 && r.peek() == Some(0x4f) {
                let body = r.data[start..r.pos - 1].to_vec();
                r.next();
                self.macros[usize::from(code - 0x21)] = Some(body);
                return;
            }
        }
    }

    fn escape(&mut self, r: &mut Bytes<'_>) {
        let Some(b) = r.next() else {
            return;
        };
        match b {
            0x6e => self.gl = 2,
            0x6f => self.gl = 3,
            0x7e => self.gr = 1,
            0x7d => self.gr = 2,
            0x7c => self.gr = 3,
            0x28..=0x2b => self.designate(usize::from(b - 0x28), false, r),
            0x24 => match r.peek() {
                Some(i @ 0x28..=0x2b) => {
                    r.next();
                    self.designate(usize::from(i - 0x28), true, r);
                }
                // 2 バイト集合を G0 に指示するときだけ 0x28 を省く。
                _ => self.designate(0, true, r),
            },
            _ => {}
        }
    }

    fn designate(&mut self, index: usize, two_bytes: bool, r: &mut Bytes<'_>) {
        let set = if r.peek() == Some(0x20) {
            r.next();
            r.next().map(|f| CodeSet::drcs(f, two_bytes))
        } else {
            r.next().map(|f| CodeSet::graphic(f, two_bytes))
        };
        if let Some(set) = set {
            self.g[index] = set;
        }
    }
}

/// パラメーターと中間文字はどれも 0x40 未満なので、0x40 以上を終端とする。
fn csi(r: &mut Bytes<'_>) -> Option<Op> {
    let mut params = Vec::new();
    let mut current: Option<u32> = None;
    loop {
        let b = r.next()?;
        match b {
            b'0'..=b'9' => {
                current = Some(
                    current
                        .unwrap_or(0)
                        .saturating_mul(10)
                        .saturating_add(u32::from(b - b'0')),
                );
            }
            0x3b => params.push(current.take().unwrap_or(0)),
            0x40.. => {
                params.extend(current);
                return Some(Op::Csi { final_byte: b, params });
            }
            _ => {}
        }
    }
}

struct Bytes<'a> {
    data: &'a [u8],
    pos: usize,
}

impl Bytes<'_> {
    fn next(&mut self) -> Option<u8> {
        let b = self.data.get(self.pos).copied();
        self.pos += usize::from(b.is_some());
        b
    }

    fn peek(&self) -> Option<u8> {
        self.data.get(self.pos).copied()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn decode(bytes: &[u8]) -> Vec<Op> {
        let mut out = Vec::new();
        Decoder::new().decode(bytes, &mut out);
        out
    }

    fn text(ops: &[Op]) -> String {
        ops.iter()
            .filter_map(|op| match op {
                Op::Char(c) => Some(*c),
                _ => None,
            })
            .collect()
    }

    #[test]
    fn decodes_hiragana_in_gr_by_default() {
        assert_eq!(text(&decode(&[0xa2, 0xf3])), "あん");
    }

    #[test]
    fn switches_to_alnum_with_ls1() {
        assert_eq!(text(&decode(&[0x0e, 0x41, 0x31, 0x0f])), "Ａ１");
    }

    #[test]
    fn single_shift_applies_to_one_character() {
        // G3 にカタカナを指示し、SS3 で 1 文字だけ GL に呼び出す。
        assert_eq!(text(&decode(&[0x1b, 0x2b, 0x31, 0x1d, 0x22, 0xa2])), "アあ");
    }

    #[test]
    fn expands_the_default_macro_that_restores_the_initial_codes() {
        // 片仮名を GR に呼び出した後、既定マクロ 0x60 で初期状態に戻す。
        let ops = decode(&[0x1b, 0x2a, 0x31, 0xa2, 0x1d, 0x60, 0xa2]);
        assert_eq!(text(&ops), "アあ");
    }

    #[test]
    fn designates_drcs_with_an_intermediate_space() {
        // 0x20 付きの F=0x41 は DRCS-1。
        let ops = decode(&[0x1b, 0x29, 0x20, 0x41, 0x0e, 0x21]);
        assert_eq!(ops, vec![Op::Drcs(0x4121)]);
    }

    #[test]
    fn reads_csi_parameters() {
        // SDF 960;540
        let ops = decode(b"\x9b960;540 V");
        assert_eq!(
            ops,
            vec![Op::Csi {
                final_byte: b'V',
                params: vec![960, 540]
            }]
        );
    }

    #[test]
    fn reads_position_and_wait() {
        let ops = decode(&[0x1c, 0x41, 0x42, 0x9d, 0x20, 0x45]);
        assert_eq!(ops, vec![Op::Aps { row: 1, column: 2 }, Op::Wait(5)]);
    }

    #[test]
    fn runs_a_defined_macro() {
        // マクロ 0x21 に「LS1 英数 A」を定義して実行する。
        let ops = decode(&[0x95, 0x40, 0x21, 0x0e, 0x41, 0x95, 0x4f, 0x1b, 0x6f, 0x21]);
        assert_eq!(text(&ops), "Ａ");
    }

    #[test]
    fn reads_colors_and_palette() {
        let ops = decode(&[0x83, 0x90, 0x51, 0x90, 0x20, 0x42]);
        assert_eq!(ops, vec![Op::Foreground(3), Op::Background(1), Op::Palette(2)]);
    }
}
