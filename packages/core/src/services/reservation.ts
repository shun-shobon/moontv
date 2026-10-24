import type { ScheduleState } from "../api/schemas";

export type ReservationAction = { label: string; scheduled: boolean };

/** 録画済み・失敗した予約は mirakc がいずれ消すので、操作を出さない。 */
const CANCEL_ACTIONS: Record<ScheduleState, ReservationAction | null> = {
	scheduled: { label: "予約を取り消す", scheduled: false },
	recording: { label: "録画を止める", scheduled: false },
	finished: null,
	failed: null,
};

export const reservationAction = (
	state: ScheduleState | null,
	ended: boolean,
): ReservationAction | null => {
	if (state == null) {
		return ended ? null : { label: "録画予約", scheduled: true };
	}
	return CANCEL_ACTIONS[state];
};
