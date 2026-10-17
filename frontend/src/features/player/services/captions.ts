import * as v from "valibot";

/** サーバーが字幕の ID3 の PRIV フレームに付ける所有者。 */
const OWNER = "moontv";

const RunSchema = v.object({
	x: v.number(),
	y: v.number(),
	cellWidth: v.number(),
	cellHeight: v.number(),
	fontWidth: v.number(),
	fontHeight: v.number(),
	text: v.optional(v.string(), ""),
	bitmap: v.optional(v.string()),
	fg: v.string(),
	bg: v.string(),
	edge: v.optional(v.string()),
	flash: v.optional(v.boolean(), false),
	underline: v.optional(v.boolean(), false),
	highlight: v.optional(v.number(), 0),
});
export type CaptionRun = v.InferOutput<typeof RunSchema>;

const BitmapSchema = v.object({
	width: v.number(),
	height: v.number(),
	levels: v.number(),
	/** 画素ごとの階調を 1 桁の数字で並べたもの。 */
	pixels: v.string(),
});
export type CaptionBitmap = v.InferOutput<typeof BitmapSchema>;

const SnapshotSchema = v.object({
	plane: v.tuple([v.number(), v.number()]),
	raster: v.optional(
		v.object({
			x: v.number(),
			y: v.number(),
			width: v.number(),
			height: v.number(),
			color: v.string(),
		}),
	),
	runs: v.array(RunSchema),
	bitmaps: v.optional(v.record(v.string(), BitmapSchema), {}),
});
export type CaptionSnapshot = v.InferOutput<typeof SnapshotSchema>;

const CaptionStateSchema = v.object({
	/** 状態が変わるたびに増える。同じ状態は毎秒送り直される。 */
	seq: v.number(),
	caption: SnapshotSchema,
	superimpose: SnapshotSchema,
});
export type CaptionState = v.InferOutput<typeof CaptionStateSchema>;

/** ID3v2.4 の大きさは各バイトの下位 7 ビットを使う。 */
const syncsafe = (bytes: Uint8Array, offset: number) =>
	((bytes[offset] ?? 0) << 21) |
	((bytes[offset + 1] ?? 0) << 14) |
	((bytes[offset + 2] ?? 0) << 7) |
	(bytes[offset + 3] ?? 0);

const decoder = new TextDecoder();

/** ID3 タグから moontv の字幕の状態を取り出す。別の用途の ID3 なら null。 */
export const parseCaptionTag = (tag: Uint8Array): CaptionState | null => {
	if (decoder.decode(tag.subarray(0, 3)) !== "ID3") {
		return null;
	}
	const end = 10 + syncsafe(tag, 6);
	let offset = 10;
	while (offset + 10 <= end) {
		const id = decoder.decode(tag.subarray(offset, offset + 4));
		const size = syncsafe(tag, offset + 4);
		const body = tag.subarray(offset + 10, offset + 10 + size);
		if (id === "PRIV") {
			const separator = body.indexOf(0);
			if (separator >= 0 && decoder.decode(body.subarray(0, separator)) === OWNER) {
				try {
					const parsed = v.safeParse(
						CaptionStateSchema,
						JSON.parse(decoder.decode(body.subarray(separator + 1))),
					);
					return parsed.success ? parsed.output : null;
				} catch {
					return null;
				}
			}
		}
		offset += 10 + size;
	}
	return null;
};

/** 再生位置からこれより前の状態は、巻き戻しても使わないので捨てる。 */
const RETENTION_SECONDS = 120;

/** 受け取った字幕の状態を時刻順に持ち、再生位置での状態を返す。 */
export class CaptionTimeline {
	#entries: { time: number; state: CaptionState }[] = [];

	add(time: number, state: CaptionState): void {
		const index = this.#entries.findLastIndex((entry) => entry.time <= time) + 1;
		this.#entries.splice(index, 0, { time, state });
	}

	at(time: number): CaptionState | null {
		const index = this.#entries.findLastIndex((entry) => entry.time <= time);
		const state = this.#entries[index]?.state ?? null;
		const stale = this.#entries.findIndex((entry) => entry.time >= time - RETENTION_SECONDS);
		// 最後に表示した状態は残す。前の状態から切り替わる時刻を知るのに要る。
		if (stale > 1) {
			this.#entries.splice(0, Math.min(stale, index));
		}
		return state;
	}
}
