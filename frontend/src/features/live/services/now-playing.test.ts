import type { Channel, Program } from "@moontv/core/api/schemas";
import { describe, expect, it } from "vitest";

import { nowPlayingOf } from "./now-playing";

describe("nowPlayingOf", () => {
	it("放送中の番組名とチャンネル名、ロゴを出す", () => {
		const nhk = channel({ id: 3, name: "NHK総合", hasLogo: true, present: program("ニュース") });

		expect(nowPlayingOf(nhk)).toEqual({
			title: "ニュース",
			artist: "NHK総合",
			artworkUrl: "/api/channels/3/logo",
		});
	});

	it("番組情報がなければチャンネル名を題名にする", () => {
		expect(nowPlayingOf(channel({ name: "NHK総合" })).title).toBe("NHK総合");
	});

	it("ロゴがなければアプリのアイコンを使う", () => {
		expect(nowPlayingOf(channel({ hasLogo: false })).artworkUrl).toBe("/icon-512.png");
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

function program(name: string): Program {
	return {
		id: 1,
		serviceId: 2,
		startAt: 0,
		duration: 60_000,
		name,
		marks: [],
		description: "",
		genres: [],
		isFree: true,
		audios: [],
	};
}
