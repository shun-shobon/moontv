import symbolsUrl from "./fonts/caption-symbols.woff2";
import textUrl from "./fonts/caption-text.woff2";

const SYMBOLS = "moontv Caption Symbols";
const TEXT = "moontv Caption Text";

/**
 * 運用規定は丸ゴシックを推奨している（TR-B14 第3巻 4.4.2）。ARIB の追加記号は、端末のフォントに任せると
 * 絵文字や別の書体で描かれるので先頭に置く。
 */
export const CAPTION_FONT_FAMILY = `"${SYMBOLS}", "${TEXT}", sans-serif`;

let registered = false;

const register = () => {
	if (registered) {
		return;
	}
	registered = true;
	document.fonts.add(new FontFace(SYMBOLS, `url("${symbolsUrl}") format("woff2")`));
	// src の先頭の local() が見つかれば url() は取りに行かないので、ヒラギノがある端末は 4MB 近い本文を読まずに済む。
	document.fonts.add(
		new FontFace(
			TEXT,
			`local("HiraMaruProN-W4"), local("Hiragino Maru Gothic ProN W4"), url("${textUrl}") format("woff2")`,
		),
	);
};

/** canvas は Web フォントを読み終えるのを待たずに代わりの書体で描く。 */
export const loadCaptionFonts = (text: string): Promise<unknown> | null => {
	register();
	const font = `36px ${CAPTION_FONT_FAMILY}`;
	return document.fonts.check(font, text) ? null : document.fonts.load(font, text);
};
