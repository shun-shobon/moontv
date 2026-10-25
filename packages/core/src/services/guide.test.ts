import { describe, expect, it } from "vitest";

import type { Channel, Program } from "../api/schemas";
import { DAY_MS, HOUR_MS, startOfBroadcastDay } from "../domain/time";
import { guideColumns, programEnd, selectableDays } from "./guide";

const DAY_START = startOfBroadcastDay(Date.UTC(2026, 9, 12, 3));

describe("selectableDays", () => {
	it("今日から1日ずつ7日分を返す", () => {
		const days = selectableDays(DAY_START);

		expect(days).toHaveLength(7);
		expect(days[0]).toBe(DAY_START);
		expect(days[6]).toBe(DAY_START + 6 * DAY_MS);
	});
});

describe("guideColumns", () => {
	it("番組のないサブチャンネルの列を除く", () => {
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
