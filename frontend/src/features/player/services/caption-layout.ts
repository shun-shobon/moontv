export type Rect = { x: number; y: number; width: number; height: number };

export const containedRect = (
	box: { width: number; height: number },
	video: { width: number; height: number },
): Rect => {
	if (video.width === 0 || video.height === 0) {
		return { x: 0, y: 0, width: box.width, height: box.height };
	}
	const scale = Math.min(box.width / video.width, box.height / video.height);
	const width = video.width * scale;
	const height = video.height * scale;
	return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
};

/** 中型の全角文字などは字形がフォントの箱より広くなる。 */
export const glyphScale = (measuredWidth: number, fontWidth: number) =>
	measuredWidth > fontWidth ? fontWidth / measuredWidth : 1;

/** 点滅は 1 秒周期で、後半の 0.5 秒は文字を消す（TR-B14 第3巻 4.5.2）。 */
export const isFlashHidden = (timeMs: number) => timeMs % 1000 >= 500;

export const alphaOf = (rrggbbaa: string) => Number.parseInt(rrggbbaa.slice(7, 9), 16) / 255;
