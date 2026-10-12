import { describe, expect, it } from "vitest";

import { isCausedByFullscreenExit, liveEdgeSeekTarget } from "./playback";

describe("liveEdgeSeekTarget", () => {
	it("最新位置から3秒を超えて遅れていれば最新位置を返す", () => {
		expect(liveEdgeSeekTarget(seekable(100), 96.9)).toBe(100);
	});

	it("遅れが3秒以内なら移動しない", () => {
		expect(liveEdgeSeekTarget(seekable(100), 97)).toBeNull();
	});

	it("複数の範囲があれば最後の範囲の終端を最新位置とする", () => {
		expect(liveEdgeSeekTarget(seekable(50, 100), 10)).toBe(100);
	});

	it("シーク可能な範囲がなければ移動しない", () => {
		expect(liveEdgeSeekTarget(seekable(), 0)).toBeNull();
	});
});

describe("isCausedByFullscreenExit", () => {
	it.each([
		[1_000, 0, true],
		[1_999, 0, true],
		[2_000, 0, false],
		[1_000, Number.NEGATIVE_INFINITY, false],
	])("全画面終了から %i ms の一時停止は %s", (pausedAt, exitedAt, expected) => {
		expect(isCausedByFullscreenExit(pausedAt, exitedAt)).toBe(expected);
	});
});

function seekable(...ends: number[]) {
	return { length: ends.length, end: (index: number) => ends[index] ?? Number.NaN };
}
