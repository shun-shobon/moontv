import type { Program } from "@moontv/core/api/schemas";
import { DAY_MS, HOUR_MS, MINUTE_MS, startOfBroadcastDay } from "@moontv/core/domain/time";
import { describe, expect, it } from "vitest";

import { initialScrollTop, nowLineTop, programBox, resolveGuideDay, toPx } from "./guide-layout";

const DAY_START = startOfBroadcastDay(Date.UTC(2026, 9, 12, 3));
const DAY_END = DAY_START + DAY_MS;

describe("resolveGuideDay", () => {
	it("選べる日はそのまま返す", () => {
		expect(resolveGuideDay(DAY_START + 6 * DAY_MS, DAY_START)).toBe(DAY_START + 6 * DAY_MS);
	});

	it.each([
		["指定なし", null],
		["過ぎた日", DAY_START - DAY_MS],
		["先すぎる日", DAY_START + 7 * DAY_MS],
	])("%sは今日にする", (_, requested) => {
		expect(resolveGuideDay(requested, DAY_START)).toBe(DAY_START);
	});
});

describe("programBox", () => {
	it("日の範囲に収まる番組は開始時刻と長さから位置を決める", () => {
		const box = programBox(
			program({ startAt: DAY_START + HOUR_MS, duration: 30 * MINUTE_MS }),
			DAY_START,
			DAY_END,
		);

		expect(box).toEqual({
			top: toPx(HOUR_MS),
			height: toPx(30 * MINUTE_MS),
			showsDescription: true,
		});
	});

	it("前日から続く番組は日の始まりから表示する", () => {
		const box = programBox(
			program({ startAt: DAY_START - HOUR_MS, duration: 2 * HOUR_MS }),
			DAY_START,
			DAY_END,
		);

		expect(box.top).toBe(0);
		expect(box.height).toBe(toPx(HOUR_MS));
	});

	it("翌日にまたがる番組は日の終わりで切る", () => {
		const box = programBox(
			program({ startAt: DAY_END - HOUR_MS, duration: 2 * HOUR_MS }),
			DAY_START,
			DAY_END,
		);

		expect(box.top + box.height).toBe(toPx(DAY_MS));
	});

	it("短い番組には説明文を出さない", () => {
		const box = programBox(
			program({ startAt: DAY_START, duration: 5 * MINUTE_MS }),
			DAY_START,
			DAY_END,
		);

		expect(box.showsDescription).toBe(false);
	});
});

describe("nowLineTop", () => {
	it("表示中の日の範囲内なら現在時刻の位置を返す", () => {
		expect(nowLineTop(DAY_START, DAY_END, DAY_START + HOUR_MS)).toBe(toPx(HOUR_MS));
	});

	it.each([
		["開始前", DAY_START - 1],
		["終了時刻ちょうど", DAY_END],
	])("%sなら null を返す", (_, now) => {
		expect(nowLineTop(DAY_START, DAY_END, now)).toBeNull();
	});
});

describe("initialScrollTop", () => {
	it("今日の番組表は現在時刻の30分前が先頭に来る位置にする", () => {
		expect(initialScrollTop(DAY_START, DAY_START + 2 * HOUR_MS)).toBe(toPx(90 * MINUTE_MS));
	});

	it("日の始まりから30分以内なら先頭にする", () => {
		expect(initialScrollTop(DAY_START, DAY_START + 10 * MINUTE_MS)).toBe(0);
	});

	it("今日以外の番組表は先頭にする", () => {
		expect(initialScrollTop(DAY_START + DAY_MS, DAY_START + 2 * HOUR_MS)).toBe(0);
	});
});

function program(overrides: Partial<Program>): Program {
	return {
		id: 1,
		serviceId: 1,
		startAt: DAY_START,
		duration: HOUR_MS,
		name: "番組",
		marks: [],
		description: "",
		genres: [],
		isFree: true,
		audios: [],
		...overrides,
	};
}
