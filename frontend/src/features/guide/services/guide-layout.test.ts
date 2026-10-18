import { describe, expect, it } from "vitest";

import type { Channel, Program } from "../../../shared/api/schemas";
import { DAY_MS, HOUR_MS, MINUTE_MS, startOfBroadcastDay } from "../../../shared/domain/time";
import {
	guideColumns,
	initialScrollTop,
	nowLineTop,
	programBox,
	programEnd,
	resolveGuideDay,
	selectableDays,
	toPx,
} from "./guide-layout";

const DAY_START = startOfBroadcastDay(Date.UTC(2026, 9, 12, 3));
const DAY_END = DAY_START + DAY_MS;

describe("selectableDays", () => {
	it("今日から1日ずつ7日分を返す", () => {
		const days = selectableDays(DAY_START);

		expect(days).toHaveLength(7);
		expect(days[0]).toBe(DAY_START);
		expect(days[6]).toBe(DAY_START + 6 * DAY_MS);
	});
});

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

describe("guideColumns", () => {
	it("その日に番組のないサブチャンネルの列を除く", () => {
		const main = channel({ id: 1 });
		const activeSub = channel({ id: 2, isSubchannel: true });
		const idleSub = channel({ id: 3, isSubchannel: true });

		const columns = guideColumns([main, activeSub, idleSub], [program({ serviceId: 2 })]);

		expect(columns).toEqual([main, activeSub]);
	});
});

describe("programEnd", () => {
	it("終了時刻が未定の番組は1時間で区切る", () => {
		expect(programEnd(program({ startAt: 0, duration: null }))).toBe(HOUR_MS);
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

function channel(overrides: Partial<Channel>): Channel {
	return {
		id: 0,
		name: "テスト",
		channelType: "GR",
		channel: "27",
		remoteControlKeyId: null,
		hasLogo: false,
		isSubchannel: false,
		present: null,
		following: null,
		...overrides,
	};
}

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
