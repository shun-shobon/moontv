import { describe, expect, it } from "vitest";

import type { Channel, Program } from "../../../shared/api/schemas";
import { describeTunerUser, tunerTypesLabel } from "./tuner-usage";

const channels = new Map([[1024, channel(1024, "テレビ総合")]]);

describe("describeTunerUser", () => {
	it("ライブ配信はチャンネル名と画質・視聴人数を出す", () => {
		expect(
			describeTunerUser(
				{
					id: "a",
					kind: "live",
					serviceId: 1024,
					codec: "hevc",
					quality: "1080p",
					audio: "main",
					viewers: 2,
				},
				channels,
			),
		).toEqual({ purpose: "ライブ", title: "テレビ総合", detail: "1080p · HEVC · 2人が視聴中" });
	});

	it("副音声の配信と視聴者のいない配信はそれと分かるようにする", () => {
		expect(
			describeTunerUser(
				{
					id: "a",
					kind: "live",
					serviceId: 1024,
					codec: "h264",
					quality: "720p",
					audio: "sub",
					viewers: 0,
				},
				channels,
			).detail,
		).toBe("720p · H.264 · 副音声 · 視聴者なし");
	});

	it("一覧に無いチャンネルは不明と出す", () => {
		expect(
			describeTunerUser(
				{
					id: "a",
					kind: "live",
					serviceId: 1,
					codec: "hevc",
					quality: "1080p",
					audio: "main",
					viewers: 1,
				},
				channels,
			).title,
		).toBe("不明なチャンネル");
	});

	it("録画は番組名とチャンネル名を出す", () => {
		expect(
			describeTunerUser(
				{ id: "a", kind: "recording", program: program("ニュース", 1024) },
				channels,
			),
		).toEqual({ purpose: "録画", title: "ニュース", detail: "テレビ総合" });
	});

	it("番組情報の無い録画も録画と分かるようにする", () => {
		expect(describeTunerUser({ id: "a", kind: "recording", program: null }, channels)).toEqual({
			purpose: "録画",
			title: "番組情報なし",
			detail: null,
		});
	});
});

describe("tunerTypesLabel", () => {
	it("受信できる種類を表示名で並べる", () => {
		expect(tunerTypesLabel({ index: 0, name: "PX", types: ["BS", "CS"], users: [] })).toBe(
			"BS・CS",
		);
	});
});

function channel(id: number, name: string): Channel {
	return {
		id,
		name,
		channelType: "GR",
		channel: "27",
		remoteControlKeyId: null,
		hasLogo: false,
		isSubchannel: false,
		present: null,
		following: null,
	};
}

function program(name: string, serviceId: number): Program {
	return {
		id: 1,
		serviceId,
		startAt: 0,
		duration: null,
		name,
		marks: [],
		description: "",
		genres: [],
		isFree: true,
		audios: [],
	};
}
