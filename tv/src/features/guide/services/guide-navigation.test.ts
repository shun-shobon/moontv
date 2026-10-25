import type { Program } from "@moontv/core/api/schemas";
import { HOUR_MS, MINUTE_MS } from "@moontv/core/domain/time";
import { describe, expect, it } from "vitest";

import { moveInColumn, programAt, scrollColumnsToShow, scrollToShow } from "./guide-navigation";

const RANGE = { start: 0, end: 24 * HOUR_MS };

describe("programAt", () => {
	it("時刻を含む番組を返し、番組の間の空きでは null を返す", () => {
		const programs = [program(0, HOUR_MS), program(2 * HOUR_MS, HOUR_MS)];

		expect(programAt(programs, 30 * MINUTE_MS)?.startAt).toBe(0);
		expect(programAt(programs, 90 * MINUTE_MS)).toBeNull();
	});
});

describe("moveInColumn", () => {
	const programs = [
		program(0, HOUR_MS),
		program(HOUR_MS, 30 * MINUTE_MS),
		program(3 * HOUR_MS, HOUR_MS),
	];

	it("下は次の番組の開始時刻へ、空きを飛ばして移る", () => {
		expect(moveInColumn(programs, 10 * MINUTE_MS, 1, RANGE)).toBe(HOUR_MS);
		expect(moveInColumn(programs, HOUR_MS, 1, RANGE)).toBe(3 * HOUR_MS);
	});

	it("上は前の番組の開始時刻へ移る", () => {
		expect(moveInColumn(programs, 3 * HOUR_MS + MINUTE_MS, -1, RANGE)).toBe(HOUR_MS);
	});

	it("番組が無ければ30分ずつ進み、範囲の外には出ない", () => {
		expect(moveInColumn([], HOUR_MS, 1, RANGE)).toBe(90 * MINUTE_MS);
		expect(moveInColumn([], 10 * MINUTE_MS, -1, RANGE)).toBe(0);
	});
});

describe("scrollToShow", () => {
	it("見えている番組では動かさない", () => {
		expect(
			scrollToShow(HOUR_MS, 3 * HOUR_MS, { start: 2 * HOUR_MS, end: 3 * HOUR_MS }, RANGE),
		).toBe(HOUR_MS);
	});

	it("上にはみ出す番組は開始時刻を先頭にする", () => {
		expect(scrollToShow(HOUR_MS, 3 * HOUR_MS, { start: 0, end: 2 * HOUR_MS }, RANGE)).toBe(0);
	});

	it("下にはみ出す番組は終わりが下端に来るようにし、表示より長ければ開始時刻を先頭にする", () => {
		expect(scrollToShow(0, 3 * HOUR_MS, { start: 2 * HOUR_MS, end: 4 * HOUR_MS }, RANGE)).toBe(
			HOUR_MS,
		);
		expect(scrollToShow(0, 3 * HOUR_MS, { start: 2 * HOUR_MS, end: 6 * HOUR_MS }, RANGE)).toBe(
			2 * HOUR_MS,
		);
	});
});

describe("scrollColumnsToShow", () => {
	it("見える列の外に出たときだけ1列ずつ送る", () => {
		expect(scrollColumnsToShow(0, 4, 5)).toBe(0);
		expect(scrollColumnsToShow(0, 5, 5)).toBe(1);
		expect(scrollColumnsToShow(3, 2, 5)).toBe(2);
	});
});

function program(startAt: number, duration: number): Program {
	return {
		id: startAt,
		serviceId: 1,
		startAt,
		duration,
		name: "番組",
		marks: [],
		description: "",
		genres: [],
		isFree: true,
		audios: [],
	};
}
