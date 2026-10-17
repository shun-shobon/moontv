import { describe, expect, it } from "vitest";

import { alphaOf, containedRect, glyphScale, isFlashHidden } from "./caption-layout";

describe("containedRect", () => {
	it("横長の枠では左右に余白を置く", () => {
		expect(containedRect({ width: 2000, height: 900 }, { width: 1920, height: 1080 })).toEqual({
			x: 200,
			y: 0,
			width: 1600,
			height: 900,
		});
	});

	it("映像の大きさが分かるまでは枠全体を使う", () => {
		expect(containedRect({ width: 640, height: 360 }, { width: 0, height: 0 })).toEqual({
			x: 0,
			y: 0,
			width: 640,
			height: 360,
		});
	});
});

describe("glyphScale", () => {
	it("箱に収まる字形はそのままにする", () => {
		expect(glyphScale(10, 18)).toBe(1);
	});

	it("はみ出す字形は箱の幅まで縮める", () => {
		expect(glyphScale(36, 18)).toBe(0.5);
	});
});

describe("isFlashHidden", () => {
	it("1 秒周期の後半で消す", () => {
		expect(isFlashHidden(1200)).toBe(false);
		expect(isFlashHidden(1700)).toBe(true);
	});
});

describe("alphaOf", () => {
	it("色の末尾 2 桁を不透明度として読む", () => {
		expect(alphaOf("#00000080")).toBeCloseTo(0.502, 3);
		expect(alphaOf("#ffffff00")).toBe(0);
	});
});
