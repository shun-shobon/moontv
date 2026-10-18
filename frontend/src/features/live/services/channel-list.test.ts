import { describe, expect, it } from "vitest";

import type { Channel, Program } from "../../../shared/api/schemas";
import { channelTypeLabel, channelTypes, currentChannelType, listedChannels } from "./channel-list";

describe("listedChannels", () => {
	it("放送中の番組がないサブチャンネルを除く", () => {
		const main = channel({ id: 1 });
		const idleSub = channel({ id: 2, isSubchannel: true });

		expect(listedChannels([main, idleSub], null)).toEqual([main]);
	});

	it("番組を放送中のサブチャンネルは残す", () => {
		const sub = channel({ id: 2, isSubchannel: true, present: program() });

		expect(listedChannels([sub], null)).toEqual([sub]);
	});

	it("視聴中のサブチャンネルは番組がなくても残す", () => {
		const sub = channel({ id: 2, isSubchannel: true });

		expect(listedChannels([sub], 2)).toEqual([sub]);
	});
});

describe("channelTypes", () => {
	it("種別を重複なく出現順に並べる", () => {
		const channels = [
			channel({ id: 1, channelType: "GR" }),
			channel({ id: 2, channelType: "BS" }),
			channel({ id: 3, channelType: "GR" }),
		];

		expect(channelTypes(channels)).toEqual(["GR", "BS"]);
	});
});

describe("currentChannelType", () => {
	const channels = [channel({ id: 1, channelType: "GR" }), channel({ id: 2, channelType: "BS" })];

	it("利用者が選んだ種別を優先する", () => {
		expect(currentChannelType(channels, "CS", 2)).toBe("CS");
	});

	it("未選択なら視聴中のチャンネルの種別にする", () => {
		expect(currentChannelType(channels, null, 2)).toBe("BS");
	});

	it("視聴中のチャンネルもなければ先頭の種別にする", () => {
		expect(currentChannelType(channels, null, null)).toBe("GR");
	});

	it("チャンネルがなければ undefined を返す", () => {
		expect(currentChannelType([], null, null)).toBeUndefined();
	});
});

describe("channelTypeLabel", () => {
	it.each([
		["GR", "地デジ"],
		["SKY", "スカパー"],
		["UNKNOWN", "UNKNOWN"],
	])("%s を %s と表示する", (type, label) => {
		expect(channelTypeLabel(type)).toBe(label);
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

function program(): Program {
	return {
		id: 1,
		serviceId: 2,
		startAt: 0,
		duration: 60_000,
		name: "番組",
		marks: [],
		description: "",
		genres: [],
		isFree: true,
		audios: [],
	};
}
