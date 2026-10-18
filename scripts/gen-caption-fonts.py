# /// script
# requires-python = "==3.14.*"
# dependencies = ["fonttools==4.66.1", "brotli==1.2.0"]
# ///
"""Rounded Mgen+ 1c Regular から字幕用のフォント2つを生成する。

usage: uv run --script scripts/gen-caption-fonts.py <rounded-mgenplus-1c-regular.ttf>

元フォントは http://jikasei.me/font/rounded-mgenplus/ が配る
https://ftp.iij.ad.jp/pub/osdn.jp/users/8/8598/rounded-mgenplus-20150602.7z
（sha256 ecea6764973d93936238f1c06ed246310bec320f63f350c2bdb7e8d1feee25cc）に入っている。

- caption-symbols.woff2: ARIB の追加記号（90〜94区）のうち漢字でない字。
  書体の候補の先頭に置き、端末のフォントが絵文字や別の字形で描くのを防ぐ。元に無い字のうち、
  端末に任せると VS15 を付けても絵文字になる字（DRAWN）は、ここで図形を描いて足す。
- caption-text.woff2: JIS X 0208 の字、英数・仮名の表、追加漢字（85〜86区）。ヒラギノ丸ゴシックが無い端末で使う。
"""

import hashlib
import pathlib
import re
import sys
import unicodedata

from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
TABLES = ROOT / "src/caption/tables/generated.rs"
OUT = ROOT / "frontend/src/features/player/media/fonts"
SOURCE_SHA256 = "c5d9a637383f40dc0356b8b4f734b36dba28de974176dce442102c0bee6370de"
BASIC_TABLES = ["ALNUM", "HIRAGANA", "KATAKANA", "JIS_X0201_KATAKANA", "HALFWIDTH"]
UNDEFINED = 0xFFFD
ROW = 94
# 3次ベジェ曲線で4分の1円を近似するときの、半径に対する制御点の距離。
KAPPA = 0.5523


def table(source: str, name: str) -> list[int]:
    body = re.search(rf"pub static {name}: \[[^\]]+\] = \[(.*?)\];", source, re.S)
    assert body, name
    return [int(v, 16) for v in re.findall(r"\\u\{([0-9a-f]+)\}", body.group(1))]



def circle(pen, cx: float, cy: float, r: float, clockwise: bool) -> None:
    k = r * KAPPA
    # 上から時計回りに、4分の1円ずつの (制御点1, 制御点2, 終点)。
    segments = [
        ((cx + k, cy + r), (cx + r, cy + k), (cx + r, cy)),
        ((cx + r, cy - k), (cx + k, cy - r), (cx, cy - r)),
        ((cx - k, cy - r), (cx - r, cy - k), (cx - r, cy)),
        ((cx - r, cy + k), (cx - k, cy + r), (cx, cy + r)),
    ]
    pen.moveTo((cx, cy + r))
    if clockwise:
        for c1, c2, end in segments:
            pen.curveTo(c1, c2, end)
    else:
        starts = [(cx, cy + r)] + [end for _, _, end in segments[:-1]]
        for (c1, c2, _), start in reversed(list(zip(segments, starts))):
            pen.curveTo(c2, c1, start)
    pen.closePath()


def rounded_bar(pen, cx: float, top: float, bottom: float, width: float) -> None:
    """上下の端を半円にした縦棒。"""
    r = width / 2
    k = r * KAPPA
    pen.moveTo((cx - r, top - r))
    pen.curveTo((cx - r, top - r + k), (cx - k, top), (cx, top))
    pen.curveTo((cx + k, top), (cx + r, top - r + k), (cx + r, top - r))
    pen.lineTo((cx + r, bottom + r))
    pen.curveTo((cx + r, bottom + r - k), (cx + k, bottom), (cx, bottom))
    pen.curveTo((cx - k, bottom), (cx - r, bottom + r - k), (cx - r, bottom + r))
    pen.closePath()


def heavy_exclamation(pen, cx: float, cy: float, size: float) -> None:
    rounded_bar(pen, cx, cy + size * 0.42, cy - size * 0.14, size * 0.2)
    circle(pen, cx, cy - size * 0.33, size * 0.1, clockwise=True)


def heavy_circle(pen, cx: float, cy: float, size: float) -> None:
    circle(pen, cx, cy, size * 0.42, clockwise=True)
    circle(pen, cx, cy, size * 0.42 - size * 0.12, clockwise=False)


# 90-03（道路上の障害物）と 90-32。どちらも Unicode では絵文字が既定の字。
DRAWN = {0x2757: heavy_exclamation, 0x2B55: heavy_circle}


def add_drawn_glyphs(font: TTFont) -> None:
    glyf = font["glyf"]
    square_name = font.getBestCmap()[0x25A1]
    square = glyf[square_name]
    square.recalcBounds(glyf)
    width = font["hmtx"][square_name][0]
    square_advance, square_top = font["vmtx"][square_name]
    # 全角の字の送り幅の中央、縦は「□」の中央に、送り幅の 9 割の大きさで描く。
    cx, cy, size = width / 2, (square.yMin + square.yMax) / 2, width * 0.9
    for code, draw in DRAWN.items():
        name = f"uni{code:04X}"
        tt_pen = TTGlyphPen(None)
        draw(Cu2QuPen(tt_pen, max_err=1), cx, cy, size)
        glyph = tt_pen.glyph()
        glyph.recalcBounds(glyf)
        # glyf に足すと、共有している字形の並び（getGlyphOrder）にも足される。
        glyf[name] = glyph
        # 左の余白を字形と合わせないと、hmtx の値で位置を決める描画系で字がずれる。
        font["hmtx"][name] = (width, glyph.xMin)
        font["vmtx"][name] = (square_advance, square_top + square.yMax - glyph.yMax)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[code] = name


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


def build(source: pathlib.Path, codes: set[int], family: str, out: pathlib.Path, drawn: bool = False) -> None:
    font = TTFont(source)
    if drawn:
        add_drawn_glyphs(font)
        codes = codes | DRAWN.keys()
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
    source = pathlib.Path(sys.argv[1])
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert digest == SOURCE_SHA256, f"元フォントが違う: {digest}"
    tables = TABLES.read_text(encoding="utf-8")
    cmap = TTFont(source).getBestCmap()

    basic = {code for name in BASIC_TABLES for code in table(tables, name)}
    basic |= {code for i, code in enumerate(table(tables, "KANJI")) if in_jis_x0208(i // ROW + 1, i % ROW + 1)}
    additional = table(tables, "ADDITIONAL")
    kanji = set(additional[: 2 * ROW])
    # 92区の「日」「年」などは普通の漢字に割り当てられている。先頭の書体に入れると本文の漢字まで置き換わる。
    symbols = {code for code in additional[5 * ROW :] if not is_ideograph(code)}
    printable_ascii = set(range(0x20, 0x7F))

    def available(codes: set[int]) -> set[int]:
        return {code for code in codes - {UNDEFINED} if code in cmap}

    OUT.mkdir(parents=True, exist_ok=True)
    build(source, available(symbols), "moontv Caption Symbols", OUT / "caption-symbols.woff2", drawn=True)
    build(source, available(basic | kanji | printable_ascii), "moontv Caption Text", OUT / "caption-text.woff2")


if __name__ == "__main__":
    main()
