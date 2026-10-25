import type { Channel, Program } from "../api/schemas";
import { DAY_MS, HOUR_MS } from "../domain/time";

const DAYS_AHEAD = 7;
/** 終了時刻が未定の番組も選べるよう、1時間分の枠を取る。 */
const UNKNOWN_DURATION_MS = HOUR_MS;

export const selectableDays = (today: number) =>
	Array.from({ length: DAYS_AHEAD }, (_, i) => today + i * DAY_MS);

/** サブチャンネルは臨時編成のときしか放送しないので、番組がある場合だけ列を出す。 */
export const guideColumns = (channels: readonly Channel[], programs: readonly Program[]) => {
	const servicesWithPrograms = new Set(programs.map((p) => p.serviceId));
	return channels.filter((c) => !c.isSubchannel || servicesWithPrograms.has(c.id));
};

export const programEnd = (program: Program) =>
	program.startAt + (program.duration ?? UNKNOWN_DURATION_MS);
