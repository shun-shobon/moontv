import { describe, expect, it } from "vitest";

import type { CaptionState } from "./captions";
import { CaptionTimeline, parseCaptionTag } from "./captions";

const encoder = new TextEncoder();

const syncsafe = (n: number) => [(n >> 21) & 0x7f, (n >> 14) & 0x7f, (n >> 7) & 0x7f, n & 0x7f];

const tag = (owner: string, payload: string) => {
	const body = [...encoder.encode(owner), 0, ...encoder.encode(payload)];
	const frame = [...encoder.encode("PRIV"), ...syncsafe(body.length), 0, 0, ...body];
	return new Uint8Array([...encoder.encode("ID3"), 4, 0, 0, ...syncsafe(frame.length), ...frame]);
};

const empty = { plane: [960, 540], runs: [] };

const state = (seq: number): CaptionState => ({
	seq,
	caption: { plane: [960, 540], runs: [], bitmaps: {} },
	superimpose: { plane: [960, 540], runs: [], bitmaps: {} },
});

describe("parseCaptionTag", () => {
	it("moontv の PRIV フレームから状態を読む", () => {
		const run = {
			x: 80,
			y: 60,
			cellWidth: 40,
			cellHeight: 60,
			fontWidth: 36,
			fontHeight: 36,
			text: "あい",
			fg: "#ffffffff",
			bg: "#00000080",
		};
		const parsed = parseCaptionTag(
			tag(
				"moontv",
				JSON.stringify({ seq: 3, caption: { ...empty, runs: [run] }, superimpose: empty }),
			),
		);

		expect(parsed?.seq).toBe(3);
		expect(parsed?.caption.runs[0]).toEqual({
			...run,
			flash: false,
			underline: false,
			highlight: 0,
		});
		expect(parsed?.superimpose.bitmaps).toEqual({});
	});

	it("ほかの用途の ID3 は無視する", () => {
		expect(parseCaptionTag(tag("com.example", "{}"))).toBeNull();
	});

	it("形の合わない JSON は無視する", () => {
		expect(parseCaptionTag(tag("moontv", '{"seq":"x"}'))).toBeNull();
		expect(parseCaptionTag(tag("moontv", "{"))).toBeNull();
	});
});

describe("CaptionTimeline", () => {
	it("再生位置までに届いた最新の状態を返す", () => {
		const timeline = new CaptionTimeline();
		timeline.add(1, state(1));
		timeline.add(3, state(2));

		expect(timeline.at(0.5)).toBeNull();
		expect(timeline.at(2)?.seq).toBe(1);
		expect(timeline.at(3)?.seq).toBe(2);
	});

	it("順不同に届いても時刻順に扱う", () => {
		const timeline = new CaptionTimeline();
		timeline.add(3, state(2));
		timeline.add(1, state(1));

		expect(timeline.at(2)?.seq).toBe(1);
	});

	it("古い状態を捨てても再生位置の状態は残す", () => {
		const timeline = new CaptionTimeline();
		timeline.add(0, state(1));
		timeline.add(10, state(2));
		timeline.add(500, state(3));

		expect(timeline.at(400)?.seq).toBe(2);
		expect(timeline.at(400)?.seq).toBe(2);
	});
});
