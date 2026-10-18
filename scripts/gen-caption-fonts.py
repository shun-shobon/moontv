# /// script
# requires-python = "==3.14.*"
# dependencies = ["fonttools==4.66.1", "brotli==1.2.0"]
# ///
"""元フォント（SOURCES のファイル名で置く）:
- rounded-mgenplus-1c-regular.ttf: http://jikasei.me/font/rounded-mgenplus/ が配る
  https://ftp.iij.ad.jp/pub/osdn.jp/users/8/8598/rounded-mgenplus-20150602.7z
  （sha256 ecea6764973d93936238f1c06ed246310bec320f63f350c2bdb7e8d1feee25cc）に入っている。
- NotoSansSymbols[wght].ttf: https://raw.githubusercontent.com/google/fonts/caa8c83707a5797d62fd02f14301391986f21d75/ofl/notosanssymbols/NotoSansSymbols%5Bwght%5D.ttf
- NotoSansSymbols2-Regular.ttf: https://raw.githubusercontent.com/google/fonts/7b6724ac7ececc713e9ba93af309f7520c9a80a3/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf
"""

import hashlib
import pathlib
import re
import sys
import unicodedata
from collections.abc import Callable

from fontTools import subset
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
TABLES = ROOT / "src/caption/tables/generated.rs"
OUT = ROOT / "frontend/src/features/player/media/fonts"
MGEN = "rounded-mgenplus-1c-regular.ttf"
NOTO = ["NotoSansSymbols2-Regular.ttf", "NotoSansSymbols[wght].ttf"]
SOURCES = {
    MGEN: "c5d9a637383f40dc0356b8b4f734b36dba28de974176dce442102c0bee6370de",
    "NotoSansSymbols[wght].ttf": "f7e7e04b4a24b6c78893d50cbfd2b2f6cae49617ab047bfef668d252adb128f7",
    "NotoSansSymbols2-Regular.ttf": "7d5fb73b7ca67a6798101741f5d280a3d016a56a197afcd4199dbb57b4b82a21",
}
BASIC_TABLES = ["ALNUM", "HIRAGANA", "KATAKANA", "JIS_X0201_KATAKANA", "HALFWIDTH"]
UNDEFINED = 0xFFFD
ROW = 94
# 3次ベジェ曲線で4分の1円を近似するときの、半径に対する制御点の距離。
KAPPA = 0.5523
GLYPH_BOX_RATIO = 0.88
# Rounded Mgen+ の「⅓」から測った値。
FRACTION_SCALE = 0.6
FRACTION_RAISE = 299
FRACTION_MAX_WIDTH = 335

# 92区56〜85点の楽器の略号（STD-B24 Table 7-10）。「|」の所で2区画に分ける。
INSTRUMENTS = [
    "(vn)", "(ob)", "(cb)", "(ce|mb)", "(hp)", "(br)", "(p)", "(s)", "(ms)", "(t)", "(bs)", "(b)",
    "(tb)", "(tp)", "(ds)", "(ag)", "(eg)", "(vo)", "(fl)", "(ke|y)", "(sa|x)", "(sy|n)", "(or|g)", "(pe|r)",
]  # fmt: skip
# Rounded Mgen+ に無い分数。ほかの分数とそろうよう、Mgen+ の「⅓」と同じ配置で組む。
FRACTIONS = {0x2189: ("0", "3"), 0x2150: ("1", "7"), 0x2151: ("1", "9"), 0x2152: ("1", "10")}
# Rounded Mgen+ にもある絵記号。天気・将棋の駒・地図記号の仲間はほとんど Noto から写すので、仲間内で字形をそろえる。
NOTO_PREFERRED = {ord(char) for char in "☀☁☂☃☖☗♠♣♥♦♨☎"}


def table(source: str, name: str) -> list[int]:
    body = re.search(rf"pub static {name}: \[[^\]]+\] = \[(.*?)\];", source, re.S)
    assert body, name
    return [int(v, 16) for v in re.findall(r"\\u\{([0-9a-f]+)\}", body.group(1))]


def circle(pen, cx: float, cy: float, r: float) -> None:
    """時計回りの円。TrueType では時計回りの輪郭が塗られる。"""
    k = r * KAPPA
    pen.moveTo((cx, cy + r))
    pen.curveTo((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy))
    pen.curveTo((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r))
    pen.curveTo((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy))
    pen.curveTo((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r))
    pen.closePath()


def rect(pen, x0: float, y0: float, x1: float, y1: float) -> None:
    pen.moveTo((x0, y0))
    pen.lineTo((x0, y1))
    pen.lineTo((x1, y1))
    pen.lineTo((x1, y0))
    pen.closePath()


def contours(recording: RecordingPen) -> list[RecordingPen]:
    out: list[RecordingPen] = []
    current = RecordingPen()
    for operator, operands in recording.value:
        current.value.append((operator, operands))
        if operator in ("closePath", "endPath"):
            out.append(current)
            current = RecordingPen()
    return out


def bounds(recording: RecordingPen) -> tuple[float, float, float, float]:
    pen = BoundsPen(None)
    recording.replay(pen)
    assert pen.bounds is not None
    return pen.bounds


def transformed(recording: RecordingPen, sx: float, sy: float, dx: float, dy: float) -> RecordingPen:
    out = RecordingPen()
    recording.replay(TransformPen(out, (sx, 0, 0, sy, dx, dy)))
    return out


class Canvas:
    def __init__(self, font: TTFont, noto: list[TTFont]) -> None:
        self.glyphs = font.getGlyphSet()
        self.cmap = font.getBestCmap()
        self.hmtx = font["hmtx"]
        square = self.record(chr(0x25A1))
        _, y_min, _, y_max = bounds(square)
        self.width = self.hmtx[self.cmap[0x25A1]][0]
        self.cy = (y_min + y_max) / 2
        self.noto = noto

    def record(self, text: str) -> RecordingPen:
        pen = DecomposingRecordingPen(self.glyphs)
        x = 0
        for char in text:
            name = self.cmap[ord(char)]
            self.glyphs[name].draw(TransformPen(pen, (1, 0, 0, 1, x, 0)))
            x += self.hmtx[name][0]
        return pen

    def advance(self, text: str) -> int:
        return sum(self.hmtx[self.cmap[ord(char)]][0] for char in text)

    def fit(self, recording: RecordingPen, size: float, cx: float, cy: float) -> RecordingPen:
        x_min, y_min, x_max, y_max = bounds(recording)
        scale = size / max(x_max - x_min, y_max - y_min)
        return transformed(
            recording,
            scale,
            scale,
            cx - (x_min + x_max) / 2 * scale,
            cy - (y_min + y_max) / 2 * scale,
        )

    def from_noto(self, code: int) -> RecordingPen | None:
        for font in self.noto:
            name = font.getBestCmap().get(code)
            if name is not None:
                glyphs = font.getGlyphSet()
                pen = DecomposingRecordingPen(glyphs)
                glyphs[name].draw(pen)
                return self.fit(pen, self.width * GLYPH_BOX_RATIO, self.width / 2, self.cy)
        return None

    def instrument(self, left: str, right: str | None) -> list[RecordingPen]:
        """2区画に分けるものは、1語に見えるよう境目に寄せる。"""
        margin = self.width * (1 - GLYPH_BOX_RATIO) / 2
        if right is None:
            total = self.advance(left)
            scale = min(1, (self.width - 2 * margin) / total)
            return [transformed(self.record(left), scale, 1, (self.width - total * scale) / 2, 0)]
        # 左右で字の幅をそろえたまま、どちらも自分の区画からはみ出さないように詰める。
        scale = min(1, (self.width - margin) / max(self.advance(left), self.advance(right)))
        return [
            transformed(self.record(left), scale, 1, self.width - self.advance(left) * scale, 0),
            transformed(self.record(right), scale, 1, 0, 0),
        ]

    def fraction(self, numerator: str, denominator: str) -> RecordingPen:
        # 「⅓」の輪郭は分子の「1」、分母の「3」、斜線の3つ。
        third = sorted(contours(self.record("\u2153")), key=lambda contour: bounds(contour)[0])
        numerator_left, denominator_right = bounds(third[0])[0], bounds(third[2])[2]
        slash = third[1]
        # 「⅓」は送り幅が全角より狭い。
        shift = (self.width - self.hmtx[self.cmap[0x2153]][0]) / 2
        out = RecordingPen()
        transformed(slash, 1, 1, shift, 0).replay(out)
        for text, baseline, align in [(numerator, FRACTION_RAISE, "left"), (denominator, 0, "right")]:
            recording = self.record(text)
            left, _, right, _ = bounds(recording)
            # 2桁の分母も1桁と同じ高さにし、幅だけを詰める。
            sx = min(FRACTION_SCALE, FRACTION_MAX_WIDTH / (right - left))
            dx = numerator_left - left * sx if align == "left" else denominator_right - right * sx
            transformed(recording, sx, FRACTION_SCALE, dx + shift, baseline).replay(out)
        return out

    def scaled_up(self, char: str) -> RecordingPen:
        return self.fit(self.record(char), self.width * GLYPH_BOX_RATIO, self.width / 2, self.cy)

    def squared_key(self) -> RecordingPen:
        """枠は「🄿」から借りる。"""
        out = RecordingPen()
        for contour in contours(self.record("\U0001f13f"))[:2]:
            contour.replay(out)
        x0, y0, x1, y1 = bounds(contours(self.record("\U0001f13f"))[1])
        unit = (x1 - x0) / 10
        # 歯が右に出るぶん、軸を左に寄せて鍵全体を枠の中央に置く。
        cx, cy = (x0 + x1) / 2 - unit * 0.5, (y0 + y1) / 2
        stroke = unit * 0.85
        ring_y, ring_r = cy + unit * 1.9, unit * 1.9
        circle(out, cx, ring_y, ring_r)
        circle(ReverseContourPen(out), cx, ring_y, ring_r - stroke)
        rect(out, cx - stroke / 2, cy - unit * 3.8, cx + stroke / 2, ring_y - ring_r + stroke / 2)
        for top in (cy - unit * 3.8 + stroke, cy - unit * 2 + stroke):
            rect(out, cx, top - stroke, cx + unit * 1.6, top)
        return out

    def diamond_with_dot(self) -> RecordingPen:
        out = RecordingPen()
        self.record("\u25c7").replay(out)
        circle(out, self.width / 2, self.cy, self.width * 0.07)
        return out


def composed_glyphs(canvas: Canvas, additional: list[int], wanted: set[int]) -> dict[int, RecordingPen]:
    glyphs: dict[int, RecordingPen] = {
        0x27D0: canvas.diamond_with_dot(),
        # 90-64・65・71 は Noto Sans Symbols にもあるが、並びの囲み文字に合わせて Mgen+ から作る。
        0x2B1B: canvas.scaled_up("\u25a0"),
        0x2B24: canvas.scaled_up("\u25cf"),
        0x26BF: canvas.squared_key(),
        # 93-77。Mgen+ の字は数式の大型演算子の作りで、全角より広く、下にずれている。
        0x2A00: canvas.scaled_up("\u2a00"),
        # 91-13 は地図記号の寺院。
        0x0FD6: canvas.record("\u534d"),
    }
    for code, (numerator, denominator) in FRACTIONS.items():
        glyphs[code] = canvas.fraction(numerator, denominator)
    cell = (92 - 85) * ROW + 55
    for abbreviation in INSTRUMENTS:
        left, _, right = abbreviation.partition("|")
        for recording in canvas.instrument(left, right or None):
            glyphs[additional[cell]] = recording
            cell += 1
    for code in sorted(wanted - glyphs.keys() - (canvas.cmap.keys() - NOTO_PREFERRED)):
        recording = canvas.from_noto(code)
        if recording is not None:
            glyphs[code] = recording
    return glyphs


def add_glyphs(font: TTFont, canvas: Canvas, glyphs: dict[int, RecordingPen]) -> None:
    glyf = font["glyf"]
    square_name = canvas.cmap[0x25A1]
    square = glyf[square_name]
    square.recalcBounds(glyf)
    square_advance, square_top = font["vmtx"][square_name]
    for code, recording in glyphs.items():
        name = f"moontv.{code:04X}"
        tt_pen = TTGlyphPen(None)
        recording.replay(Cu2QuPen(tt_pen, max_err=1))
        glyph = tt_pen.glyph()
        glyph.recalcBounds(glyf)
        # glyf に足すと、共有している字形の並び（getGlyphOrder）にも足される。
        glyf[name] = glyph
        # 左の余白を字形と合わせないと、hmtx の値で位置を決める描画系で字がずれる。
        font["hmtx"][name] = (canvas.width, glyph.xMin)
        font["vmtx"][name] = (square_advance, square_top + square.yMax - glyph.yMax)
        for subtable in font["cmap"].tables:
            if subtable.isUnicode() and (code <= 0xFFFF or subtable.format == 12):
                subtable.cmap[code] = name


def in_jis_x0208(row: int, cell: int) -> bool:
    """KANJI は JIS X 0213 の第1面の表。字幕が使う JIS X 0208 の区点だけを残す。"""
    ranges = {
        1: [(1, 94)],
        2: [(1, 14), (26, 33), (42, 48), (60, 74), (82, 89), (94, 94)],
        3: [(16, 25), (33, 58), (65, 90)],
        4: [(1, 83)],
        5: [(1, 86)],
        6: [(1, 24), (33, 56)],
        7: [(1, 33), (49, 81)],
        8: [(1, 32)],
        47: [(1, 51)],
        84: [(1, 6)],
    }
    if 16 <= row <= 83 and row != 47:
        return True
    return any(lo <= cell <= hi for lo, hi in ranges.get(row, []))


def is_ideograph(code: int) -> bool:
    return unicodedata.name(chr(code), "").startswith(("CJK UNIFIED IDEOGRAPH", "CJK COMPATIBILITY IDEOGRAPH"))


def build(
    font: TTFont,
    codes: set[int],
    family: str,
    out: pathlib.Path,
    extend: Callable[[TTFont], set[int]] | None = None,
) -> None:
    if extend is not None:
        codes = codes | extend(font)
    codes = {code for code in codes - {UNDEFINED} if code in font.getBestCmap()}
    options = subset.Options()
    # 字幕は1字ずつマスに置くので、組版の機能も縦書きの字形も使わない。
    options.layout_features = []
    options.hinting = False
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=codes)
    subsetter.subset(font)
    # 改変したものなので、端末に入っている元のフォントと名前で取り違えないようにする。
    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 3, 4, 6, 16, 17):
            names.removeNames(nameID=record.nameID)
    names.setName(family, 1, 3, 1, 0x409)
    names.setName(family, 4, 3, 1, 0x409)
    names.setName(family.replace(" ", ""), 6, 3, 1, 0x409)
    # subset.Options の flavor は保存に効かないので、フォントに直接指定する。
    font.flavor = "woff2"
    font.save(out)
    print(f"{out.relative_to(ROOT)}: {len(codes)} 字, {out.stat().st_size} bytes")


def write_sheet(fonts: list[TTFont], additional: list[int], out: pathlib.Path) -> None:
    """字は Canvas と同じく □ の縦の中央にそろえる。"""
    columns, cell, size = 16, 72, 48
    scale = size / fonts[0]["head"].unitsPerEm
    text = next(font for font in fonts if 0x25A1 in font.getBestCmap())
    square = text.getGlyphSet()[text.getBestCmap()[0x25A1]]
    pen = BoundsPen(None)
    square.draw(pen)
    assert pen.bounds is not None
    middle = (pen.bounds[1] + pen.bounds[3]) / 2
    body: list[str] = []
    y = 0
    for ku in range(90, 95):
        body.append(f'<text x="8" y="{y + 28}" font-size="18" font-weight="bold">{ku}区</text>')
        y += 40
        cells = [(ten, additional[(ku - 85) * ROW + ten - 1]) for ten in range(1, ROW + 1)]
        cells = [(ten, code) for ten, code in cells if code != UNDEFINED]
        for i, (ten, code) in enumerate(cells):
            x, top = (i % columns) * cell, y + (i // columns) * cell
            font = next(font for font in fonts if code in font.getBestCmap())
            name = font.getBestCmap()[code]
            path = SVGPathPen(font.getGlyphSet())
            font.getGlyphSet()[name].draw(path)
            dx = x + (cell - font["hmtx"][name][0] * scale) / 2
            dy = top + 4 + size / 2 + middle * scale
            body.append(f'<rect x="{x + 4}" y="{top + 4}" width="{cell - 8}" height="{size}" fill="#f2f2f2"/>')
            body.append(f'<path transform="translate({dx:.1f} {dy:.1f}) scale({scale} -{scale})" d="{path.getCommands()}"/>')
            body.append(f'<text x="{x + cell / 2}" y="{top + size + 18}" font-size="11" text-anchor="middle">{ku}-{ten:02d}</text>')
        y += (len(cells) + columns - 1) // columns * cell + 8
    width = columns * cell
    out.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{y}" viewBox="0 0 {width} {y}"'
        ' font-family="sans-serif">'
        f'<rect width="{width}" height="{y}" fill="#fff"/>' + "".join(body) + "</svg>\n",
        encoding="utf-8",
    )
    print(f"{out.relative_to(ROOT)}: {out.stat().st_size} bytes")


def main() -> None:
    directory = pathlib.Path(sys.argv[1])
    for name, expected in SOURCES.items():
        digest = hashlib.sha256((directory / name).read_bytes()).hexdigest()
        assert digest == expected, f"{name} が違う: {digest}"

    def mgen() -> TTFont:
        # 保存のたびに更新日時が変わると、中身が同じでも生成物が差分になる。
        return TTFont(directory / MGEN, recalcTimestamp=False)

    tables = TABLES.read_text(encoding="utf-8")
    basic = {code for name in BASIC_TABLES for code in table(tables, name)}
    basic |= {code for i, code in enumerate(table(tables, "KANJI")) if in_jis_x0208(i // ROW + 1, i % ROW + 1)}
    additional = table(tables, "ADDITIONAL")
    kanji = set(additional[: 2 * ROW])
    # 92区の「日」「年」などは普通の漢字に割り当てられている。先頭の書体に入れると本文の漢字まで置き換わる。
    symbols = {code for code in additional[5 * ROW :] if code != UNDEFINED and not is_ideograph(code)}
    printable_ascii = set(range(0x20, 0x7F))

    def add_symbols(font: TTFont) -> set[int]:
        canvas = Canvas(font, [TTFont(directory / name) for name in NOTO])
        glyphs = composed_glyphs(canvas, additional, symbols)
        add_glyphs(font, canvas, glyphs)
        missing = symbols - glyphs.keys() - canvas.cmap.keys()
        assert not missing, " ".join(f"U+{code:04X}" for code in sorted(missing))
        return set(glyphs)

    OUT.mkdir(parents=True, exist_ok=True)
    build(mgen(), symbols, "moontv Caption Symbols", OUT / "caption-symbols.woff2", add_symbols)
    build(mgen(), basic | kanji | printable_ascii, "moontv Caption Text", OUT / "caption-text.woff2")
    fonts = [TTFont(OUT / "caption-symbols.woff2"), TTFont(OUT / "caption-text.woff2")]
    write_sheet(fonts, additional, OUT / "caption-symbols.svg")


if __name__ == "__main__":
    main()
