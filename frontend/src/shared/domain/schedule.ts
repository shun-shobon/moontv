import type { ScheduleState } from "../api/schemas";

export const SCHEDULE_LABELS: Record<ScheduleState, string> = {
	scheduled: "録画予約済み",
	recording: "録画中",
	finished: "録画済み",
	failed: "録画失敗",
};

/** 番組表のセルのような狭い場所に添える表記。 */
export const SCHEDULE_SHORT_LABELS: Record<ScheduleState, string> = {
	scheduled: "予約",
	recording: "録画中",
	finished: "録画済",
	failed: "録画失敗",
};
