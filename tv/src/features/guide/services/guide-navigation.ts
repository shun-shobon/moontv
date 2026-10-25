import type { Program } from "@moontv/core/api/schemas";
import { MINUTE_MS } from "@moontv/core/domain/time";
import { programEnd } from "@moontv/core/services/guide";

/** 番組情報の無い時間帯（読み込み前を含む）は、この幅ずつ進む。 */
const EMPTY_STEP_MS = 30 * MINUTE_MS;

export type TimeRange = { start: number; end: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** `programs` は開始時刻の順に並んでいること。 */
export const programAt = (programs: readonly Program[], time: number): Program | null =>
	programs.find((p) => p.startAt <= time && time < programEnd(p)) ?? null;

/** 縦の移動は番組単位。移った先の番組の開始時刻を返す。 */
export const moveInColumn = (
	programs: readonly Program[],
	time: number,
	direction: 1 | -1,
	range: TimeRange,
): number => {
	const current = programAt(programs, time);
	if (direction === 1) {
		const from = current == null ? time : programEnd(current);
		const next = programs.find((p) => p.startAt >= from);
		return clamp(next?.startAt ?? from + EMPTY_STEP_MS, range.start, range.end - 1);
	}
	const from = current == null ? time : current.startAt;
	const previous = programs.findLast((p) => programEnd(p) <= from);
	return clamp(previous?.startAt ?? from - EMPTY_STEP_MS, range.start, range.end - 1);
};

/** 選んだ番組が見えるよう、表示の先頭の時刻を決める。表示より長い番組は先頭を見せる。 */
export const scrollToShow = (
	viewStart: number,
	visibleMs: number,
	target: TimeRange,
	range: TimeRange,
): number => {
	let next = viewStart;
	if (target.start < viewStart) {
		next = target.start;
	} else if (target.end > viewStart + visibleMs) {
		next = Math.min(target.start, target.end - visibleMs);
	}
	return clamp(next, range.start, Math.max(range.start, range.end - visibleMs));
};

export const scrollColumnsToShow = (firstColumn: number, column: number, visibleCount: number) => {
	if (column < firstColumn) {
		return column;
	}
	if (column >= firstColumn + visibleCount) {
		return column - visibleCount + 1;
	}
	return firstColumn;
};
