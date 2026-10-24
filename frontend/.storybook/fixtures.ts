import type { Channel, Program } from "@moontv/core/api/schemas";
import { HOUR_MS, MINUTE_MS, startOfBroadcastDay } from "@moontv/core/domain/time";

/** 実行日によって表示が変わらないよう、時刻を固定する。 */
export const NOW = new Date(2026, 9, 14, 20, 15).getTime();
export const DAY_START = startOfBroadcastDay(NOW);
export const DAY_END = DAY_START + 24 * HOUR_MS;

let nextProgramId = 1;

export const program = (overrides: Partial<Program> = {}): Program => ({
	id: nextProgramId++,
	serviceId: 1024,
	startAt: new Date(2026, 9, 14, 20, 0).getTime(),
	duration: HOUR_MS,
	name: "ニュースウオッチ",
	marks: ["字幕", "解説"],
	description: "国内外の最新ニュースと天気をお伝えします。",
	genres: [0],
	isFree: true,
	audios: [],
	...overrides,
});

export const channel = (overrides: Partial<Channel> = {}): Channel => {
	const id = overrides.id ?? 1024;
	return {
		id,
		name: "テレビ総合",
		channelType: "GR",
		channel: "27",
		remoteControlKeyId: 1,
		hasLogo: false,
		isSubchannel: false,
		present: program({ serviceId: id }),
		following: program({
			serviceId: id,
			startAt: new Date(2026, 9, 14, 21, 0).getTime(),
			name: "ドラマ「月の裏側」",
			genres: [3],
		}),
		...overrides,
	};
};

export const CHANNELS: Channel[] = [
	channel(),
	channel({
		id: 1032,
		name: "教育テレビ",
		channel: "26",
		remoteControlKeyId: 2,
		present: program({ serviceId: 1032, name: "サイエンスの扉", genres: [8] }),
	}),
	channel({
		id: 1040,
		name: "長い名前のチャンネル放送局ワン",
		channel: "25",
		remoteControlKeyId: 4,
		present: program({
			serviceId: 1040,
			name: "とても長い番組名が入ったバラエティ特番スペシャル 2時間拡大版 前編",
			duration: 2 * HOUR_MS,
			genres: [5],
		}),
		following: null,
	}),
	channel({
		id: 1041,
		name: "サブチャンネル",
		channel: "25",
		remoteControlKeyId: 4,
		isSubchannel: true,
		present: null,
		following: null,
	}),
	channel({
		id: 101,
		name: "BS放送",
		channelType: "BS",
		channel: "BS15_0",
		remoteControlKeyId: null,
		present: program({ serviceId: 101, name: "映画「星の海」", genres: [6] }),
	}),
];

export const dayPrograms = (channels: readonly Channel[]): Program[] =>
	channels.flatMap((c, column) => {
		const programs: Program[] = [];
		let startAt = DAY_START;
		let index = column;
		while (startAt < DAY_END) {
			const duration = (15 + ((index * 7) % 6) * 15) * MINUTE_MS;
			programs.push(
				program({
					serviceId: c.id,
					startAt,
					duration,
					name: `番組 ${index + 1}`,
					genres: [index % 13],
				}),
			);
			startAt += duration;
			index++;
		}
		return programs;
	});
