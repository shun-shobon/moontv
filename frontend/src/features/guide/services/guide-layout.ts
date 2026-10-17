import type { Channel, Program } from "../../../shared/api/schemas";
import { DAY_MS, HOUR_MS, MINUTE_MS, startOfBroadcastDay } from "../../../shared/domain/time";

const PX_PER_MINUTE = 3;
export const COLUMN_WIDTH_PX = 176;
export const TIME_COLUMN_WIDTH_PX = 40;
const DAYS_AHEAD = 7;
/** 番組表を開いたとき、現在時刻の少し前から見えるようにする。 */
const SCROLL_LEAD_MS = 30 * MINUTE_MS;
/** 終了時刻が未定の番組も選べるよう、1時間分の枠を取る。 */
const UNKNOWN_DURATION_MS = HOUR_MS;
/** これより低い枠に説明文を入れても1行も読めない。 */
const DESCRIPTION_MIN_HEIGHT_PX = 48;

export const toPx = (ms: number) => (ms / MINUTE_MS) * PX_PER_MINUTE;

export const DAY_HEIGHT_PX = toPx(DAY_MS);
export const HOUR_HEIGHT_PX = toPx(HOUR_MS);

export const gridWidth = (columnCount: number) =>
	TIME_COLUMN_WIDTH_PX + columnCount * COLUMN_WIDTH_PX;

export const selectableDays = (today: number) =>
	Array.from({ length: DAYS_AHEAD }, (_, i) => today + i * DAY_MS);

/** 選べない日（過ぎた日や先すぎる日）や指定なしは今日にする。 */
export const resolveGuideDay = (requested: number | null, today: number) =>
	requested != null && selectableDays(today).includes(requested) ? requested : today;

export const hourMarks = (dayStart: number) =>
	Array.from({ length: 24 }, (_, i) => dayStart + i * HOUR_MS);

/** サブチャンネルは臨時編成のときしか放送しないので、その日に番組がある場合だけ列を出す。 */
export const guideColumns = (channels: readonly Channel[], programs: readonly Program[]) => {
	const servicesWithPrograms = new Set(programs.map((p) => p.serviceId));
	return channels.filter((c) => !c.isSubchannel || servicesWithPrograms.has(c.id));
};

export const programEnd = (program: Program) =>
	program.startAt + (program.duration ?? UNKNOWN_DURATION_MS);

/** 日をまたぐ番組は表示中の日の範囲に切り詰める。 */
export const programBox = (program: Program, dayStart: number, dayEnd: number) => {
	const start = Math.max(program.startAt, dayStart);
	const end = Math.min(programEnd(program), dayEnd);
	const height = toPx(end - start);
	return {
		top: toPx(start - dayStart),
		height,
		showsDescription: height > DESCRIPTION_MIN_HEIGHT_PX,
	};
};

export const nowLineTop = (dayStart: number, dayEnd: number, now: number) =>
	dayStart <= now && now < dayEnd ? toPx(now - dayStart) : null;

export const initialScrollTop = (dayStart: number, now: number) =>
	dayStart === startOfBroadcastDay(now) ? Math.max(0, toPx(now - dayStart - SCROLL_LEAD_MS)) : 0;
