export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const timeFormat = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("ja-JP", {
	month: "numeric",
	day: "numeric",
	weekday: "short",
});

export const formatTime = (ms: number) => timeFormat.format(ms);

export const formatDate = (ms: number) => dateFormat.format(ms);

export const formatRange = (startMs: number, durationMs: number | null) =>
	durationMs == null
		? `${formatTime(startMs)} 〜`
		: `${formatTime(startMs)} 〜 ${formatTime(startMs + durationMs)}`;

export const isOnAir = (startMs: number, durationMs: number | null, nowMs: number) =>
	startMs <= nowMs && (durationMs == null || nowMs < startMs + durationMs);

/** 放送の1日は4時で切り替わるため、番組表の日付も4時を境にする。 */
const BROADCAST_DAY_START_HOUR = 4;

export const startOfBroadcastDay = (ms: number) => {
	const date = new Date(ms - BROADCAST_DAY_START_HOUR * HOUR_MS);
	date.setHours(BROADCAST_DAY_START_HOUR, 0, 0, 0);
	return date.getTime();
};
