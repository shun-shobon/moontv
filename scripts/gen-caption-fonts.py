# /// script
# requires-python = "==3.14.*"
# dependencies = ["fonttools==4.66.1", "brotli==1.2.0"]
# ///
"""字幕用のフォント2つを生成する。

usage: uv run --locked --script scripts/gen-caption-fonts.py <元フォントを置いたディレクトリ>

元フォント（SOURCES のファイル名で置く）:
- rounded-mgenplus-1c-regular.ttf: http://jikasei.me/font/rounded-mgenplus/ が配る
  https://ftp.iij.ad.jp/pub/osdn.jp/users/8/8598/rounded-mgenplus-20150602.7z
  （sha256 ecea6764973d93936238f1c06ed246310bec320f63f350c2bdb7e8d1feee25cc）に入っている。
- NotoSansSymbols[wght].ttf: https://raw.githubusercontent.com/google/fonts/caa8c83707a5797d62fd02f14301391986f21d75/ofl/notosanssymbols/NotoSansSymbols%5Bwght%5D.ttf
- NotoSansSymbols2-Regular.ttf: https://raw.githubusercontent.com/google/fonts/7b6724ac7ececc713e9ba93af309f7520c9a80a3/ofl/notosanssymbols2/NotoSansSymbols2-Regular.ttf

生成するもの:
- caption-symbols.woff2: ARIB の追加記号（90〜94区）のうち漢字でない字。書体の候補の先頭に置き、端末のフォントが
  絵文字や別の字形で描くのを防ぐ。Rounded Mgen+ に無い字は、Noto Sans Symbols から写すか（NOTO）、
  Rounded Mgen+ の字を組み合わせるか、図形を描いて足す（composed_glyphs）。
- caption-text.woff2: JIS X 0208 の字、英数・仮名の表、追加漢字（85〜86区）。ヒラギノ丸ゴシックが無い端末で使う。
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
# 足す字を置く枠の、全角の送り幅に対する大きさ。
BOX = 0.88

# 92区56〜85点の楽器の略号（STD-B24 Table 7-10）。「|」の所で2区画に分ける。
INSTRUMENTS = [
    "(vn)", "(ob)", "(cb)", "(ce|mb)", "(hp)", "(br)", "(p)", "(s)", "(ms)", "(t)", "(bs)", "(b)",
    "(tb)", "(tp)", "(ds)", "(ag)", "(eg)", "(vo)", "(fl)", "(ke|y)", "(sa|x)", "(sy|n)", "(or|g)", "(pe|r)",
]  # fmt: skip
FRACTIONS = {0x2189: ("0", "3"), 0x2150: ("1", "7"), 0x2151: ("1", "9"), 0x2152: ("1", "10")}


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
    """Rounded Mgen+ の全角の字の枠（送り幅 width、縦の中心 cy）に、足す字を描く。"""

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
        """Rounded Mgen+ の字を送り幅どおりに並べる。"""
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
        """縦横の比を保ったまま、size 四方に収めて (cx, cy) を中心に置く。"""
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
                return self.fit(pen, self.width * BOX, self.width / 2, self.cy)
        return None

    def instrument(self, left: str, right: str | None) -> list[RecordingPen]:
        """括弧書きの略号を横に詰めて置く。2区画に分けるものは、間を空けずに左右の区画に分ける。"""
        cells = 1 if right is None else 2
        margin = self.width * (1 - BOX) / 2
        total = self.advance(left) + (0 if right is None else self.advance(right))
        scale = min(1, (self.width * cells - 2 * margin) / total)
        if right is None:
            return [transformed(self.record(left), scale, 1, (self.width - total * scale) / 2, 0)]
        return [
            transformed(self.record(left), scale, 1, self.width - self.advance(left) * scale, 0),
            transformed(self.record(right), scale, 1, 0, 0),
        ]

    def fraction(self, numerator: str, denominator: str) -> RecordingPen:
        out = RecordingPen()
        slash = self.fit(self.record("\u2044"), self.width * 0.7, self.width / 2, self.cy)
        slash.replay(out)
        digit = self.width * 0.42
        for text, cx, cy in [
            (numerator, self.width * 0.28, self.cy + digit * 0.45),
            (denominator, self.width * 0.72, self.cy - digit * 0.45),
        ]:
            recording = self.record(text)
            x_min, y_min, x_max, y_max = bounds(recording)
            # 2桁の分母も1桁と同じ高さにし、幅だけを詰める。
            scale = digit / (y_max - y_min)
            sx = min(scale, digit / (x_max - x_min))
            transformed(
                recording, sx, scale, cx - (x_min + x_max) / 2 * sx, cy - (y_min + y_max) / 2 * scale
            ).replay(out)
        return out

    def diamond_with_dot(self) -> RecordingPen:
        out = RecordingPen()
        self.record("\u25c7").replay(out)
        circle(out, self.width / 2, self.cy, self.width * 0.07)
        return out


def composed_glyphs(canvas: Canvas, additional: list[int], wanted: set[int]) -> dict[int, RecordingPen]:
    """Rounded Mgen+ に無い追加記号の字形。"""
    glyphs: dict[int, RecordingPen] = {
        0x27D0: canvas.diamond_with_dot(),
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
    for code in sorted(wanted - glyphs.keys() - canvas.cmap.keys()):
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
    options.flavor = "woff2"
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
    font.save(out)
    print(f"{out.relative_to(ROOT)}: {len(codes)} 字, {out.stat().st_size} bytes")


def main() -> None:
    directory = pathlib.Path(sys.argv[1])
    for name, expected in SOURCES.items():
        digest = hashlib.sha256((directory / name).read_bytes()).hexdigest()
        assert digest == expected, f"{name} が違う: {digest}"

    def mgen() -> TTFont:
        # 保存のたびに更新日時が変わると、中身が同じでも生成物が差分になる。元フォントの日時のまま残す。
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


if __name__ == "__main__":
    main()
