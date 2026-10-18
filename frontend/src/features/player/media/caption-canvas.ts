import type { Rect } from "../services/caption-layout";
import { alphaOf, glyphScale, isFlashHidden } from "../services/caption-layout";
import type { CaptionBitmap, CaptionRun, CaptionSnapshot } from "../services/captions";
import { CAPTION_FONT_FAMILY } from "./caption-fonts";

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/** 同梱の記号フォントに無い絵記号も、端末の絵文字ではなく文字の字形で描かせる（VS15）。 */
const asText = (glyph: string) => (PICTOGRAPHIC.test(glyph) ? `${glyph}\uFE0E` : glyph);

export class BitmapCache {
	#images = new Map<string, HTMLCanvasElement>();

	get(key: string, bitmap: CaptionBitmap, color: string): HTMLCanvasElement {
		const cacheKey = `${key}${color}`;
		const cached = this.#images.get(cacheKey);
		if (cached != null) {
			return cached;
		}
		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext("2d");
		if (context != null) {
			const image = context.createImageData(bitmap.width, bitmap.height);
			const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16));
			const alpha = alphaOf(color) * 255;
			for (let i = 0; i < bitmap.pixels.length; i++) {
				const level = Number(bitmap.pixels[i]);
				image.data.set([r ?? 0, g ?? 0, b ?? 0, (alpha * level) / (bitmap.levels - 1)], i * 4);
			}
			context.putImageData(image, 0, 0);
		}
		this.#images.set(cacheKey, canvas);
		return canvas;
	}
}

const drawGlyph = (
	context: CanvasRenderingContext2D,
	run: CaptionRun,
	glyph: string,
	cellX: number,
) => {
	const centerX = cellX + run.cellWidth / 2;
	const centerY = run.y + run.cellHeight / 2;
	const text = asText(glyph);
	const scale = glyphScale(context.measureText(text).width, run.fontWidth);
	context.save();
	context.translate(centerX, centerY);
	context.scale(scale, 1);
	if (run.edge != null) {
		context.strokeStyle = run.edge;
		context.lineWidth = run.fontHeight / 8;
		context.lineJoin = "round";
		context.strokeText(text, 0, 0);
	}
	context.fillStyle = run.fg;
	context.fillText(text, 0, 0);
	context.restore();
};

/** HLC のビットは 0 から順に下・右・上・左の辺。 */
const drawHighlight = (context: CanvasRenderingContext2D, run: CaptionRun, cellX: number) => {
	context.fillStyle = run.fg;
	const { cellWidth: w, cellHeight: h, y } = run;
	const edges: [number, number, number, number][] = [
		[cellX, y + h - 1, w, 1],
		[cellX + w - 1, y, 1, h],
		[cellX, y, w, 1],
		[cellX, y, 1, h],
	];
	edges.forEach(([x, top, width, height], bit) => {
		if ((run.highlight & (1 << bit)) !== 0) {
			context.fillRect(x, top, width, height);
		}
	});
};

const drawRun = (
	context: CanvasRenderingContext2D,
	snapshot: CaptionSnapshot,
	run: CaptionRun,
	timeMs: number,
	bitmaps: BitmapCache,
) => {
	// サーバーは Unicode のコードポイント 1 つを区画 1 つに置くので、書記素ではなくコードポイントで分ける。
	const glyphs = run.bitmap == null ? Array.from(run.text) : [null];
	if (alphaOf(run.bg) > 0) {
		context.fillStyle = run.bg;
		context.fillRect(run.x, run.y, run.cellWidth * glyphs.length, run.cellHeight);
	}
	const hidden = run.flash && isFlashHidden(timeMs);
	context.font = `${run.fontHeight}px ${CAPTION_FONT_FAMILY}`;
	glyphs.forEach((glyph, i) => {
		const cellX = run.x + run.cellWidth * i;
		if (!hidden) {
			const bitmap = run.bitmap == null ? undefined : snapshot.bitmaps[run.bitmap];
			if (glyph != null) {
				drawGlyph(context, run, glyph, cellX);
			} else if (run.bitmap != null && bitmap != null) {
				context.drawImage(
					bitmaps.get(run.bitmap, bitmap, run.fg),
					cellX + (run.cellWidth - run.fontWidth) / 2,
					run.y + (run.cellHeight - run.fontHeight) / 2,
					run.fontWidth,
					run.fontHeight,
				);
			}
		}
		if (run.underline) {
			context.fillStyle = run.fg;
			context.fillRect(cellX, run.y + run.cellHeight - 1, run.cellWidth, 1);
		}
		if (run.highlight !== 0) {
			drawHighlight(context, run, cellX);
		}
	});
};

export const drawSnapshot = (
	context: CanvasRenderingContext2D,
	snapshot: CaptionSnapshot,
	rect: Rect,
	pixelRatio: number,
	timeMs: number,
	bitmaps: BitmapCache,
) => {
	const [planeWidth, planeHeight] = snapshot.plane;
	context.setTransform(
		(pixelRatio * rect.width) / planeWidth,
		0,
		0,
		(pixelRatio * rect.height) / planeHeight,
		pixelRatio * rect.x,
		pixelRatio * rect.y,
	);
	context.textAlign = "center";
	context.textBaseline = "middle";
	const { raster } = snapshot;
	if (raster != null && alphaOf(raster.color) > 0) {
		context.fillStyle = raster.color;
		context.fillRect(raster.x, raster.y, raster.width, raster.height);
	}
	for (const run of snapshot.runs) {
		drawRun(context, snapshot, run, timeMs, bitmaps);
	}
	context.setTransform(1, 0, 0, 1, 0, 0);
};
