import { useCallback, useState } from "react";

import { useChannels, usePrograms } from "../api/queries";
import type { Channel, Program } from "../api/schemas";
import { genreStyle } from "../domain/genre";
import {
	DAY_MS,
	HOUR_MS,
	MINUTE_MS,
	formatDate,
	formatTime,
	startOfBroadcastDay,
} from "../domain/time";
import { ProgramDialog } from "./program-dialog";
import { useNow } from "./use-now";

const PX_PER_MINUTE = 3;
const COLUMN_WIDTH_PX = 176;
const TIME_COLUMN_WIDTH_PX = 40;
const DAYS_AHEAD = 7;
/** 番組表を開いたとき、現在時刻の少し前から見えるようにする。 */
const SCROLL_LEAD_MS = 30 * MINUTE_MS;

const toPx = (ms: number) => (ms / MINUTE_MS) * PX_PER_MINUTE;

export function GuidePage() {
	const now = useNow();
	const today = startOfBroadcastDay(now);
	const [dayStart, setDayStart] = useState(today);
	const dayEnd = dayStart + DAY_MS;
	const channels = useChannels();
	const programs = usePrograms(dayStart, dayEnd);
	const [selected, setSelected] = useState<Program | null>(null);
	const scrollToNow = useCallback(
		(el: HTMLDivElement | null) => {
			if (el == null) {
				return;
			}
			const isToday = dayStart === startOfBroadcastDay(Date.now());
			el.scrollTop = isToday ? Math.max(0, toPx(Date.now() - dayStart - SCROLL_LEAD_MS)) : 0;
		},
		[dayStart],
	);

	const days = Array.from({ length: DAYS_AHEAD }, (_, i) => today + i * DAY_MS);
	const channelList = channels.data ?? [];
	const servicesWithPrograms = new Set(programs.data?.map((p) => p.serviceId));
	const columns = channelList.filter((c) => !c.isSubchannel || servicesWithPrograms.has(c.id));

	return (
		<div className="flex h-[calc(100dvh-3.5rem)] flex-col">
			<div className="border-line text-label flex shrink-0 gap-1 overflow-x-auto border-b px-4 py-2">
				{days.map((day) => (
					<button
						key={day}
						type="button"
						aria-pressed={day === dayStart}
						className={`shrink-0 rounded-md px-3 py-1.5 ${day === dayStart ? "bg-selected text-fg" : "text-fg-muted hover:text-fg"}`}
						onClick={() => {
							setDayStart(day);
						}}
					>
						{formatDate(day)}
					</button>
				))}
			</div>
			{programs.isError || channels.isError ? (
				<p className="text-fg-muted text-label p-8 text-center">番組情報を取得できませんでした。</p>
			) : programs.data == null || channels.data == null ? (
				<p className="text-fg-muted text-label p-8 text-center">読み込み中…</p>
			) : programs.data.length === 0 ? (
				<p className="text-fg-muted text-label p-8 text-center">
					番組情報がありません。mirakc が EPG を取得するまでお待ちください。
				</p>
			) : (
				<div ref={scrollToNow} className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
					<Grid
						channels={columns}
						programs={programs.data}
						dayStart={dayStart}
						dayEnd={dayEnd}
						now={now}
						onSelect={setSelected}
					/>
				</div>
			)}
			{selected != null && (
				<ProgramDialog
					program={selected}
					channel={channelList.find((c) => c.id === selected.serviceId)}
					now={now}
					onClose={() => {
						setSelected(null);
					}}
				/>
			)}
		</div>
	);
}

type GridProps = {
	channels: readonly Channel[];
	programs: readonly Program[];
	dayStart: number;
	dayEnd: number;
	now: number;
	onSelect: (program: Program) => void;
};

function Grid({ channels, programs, dayStart, dayEnd, now, onSelect }: GridProps) {
	const height = toPx(DAY_MS);
	const hours = Array.from({ length: 24 }, (_, i) => dayStart + i * HOUR_MS);
	const showNow = dayStart <= now && now < dayEnd;

	return (
		<div
			className="relative"
			style={{ width: TIME_COLUMN_WIDTH_PX + channels.length * COLUMN_WIDTH_PX }}
		>
			<div className="border-line bg-canvas sticky top-0 z-20 flex border-b">
				<div
					className="bg-canvas sticky left-0 z-30 shrink-0"
					style={{ width: TIME_COLUMN_WIDTH_PX }}
				/>
				{channels.map((channel) => (
					<div
						key={channel.id}
						className="border-line text-caption-strong shrink-0 truncate border-l px-2 py-2 text-center"
						style={{ width: COLUMN_WIDTH_PX }}
					>
						{channel.name}
					</div>
				))}
			</div>
			<div className="relative flex" style={{ height }}>
				<div
					className="bg-canvas sticky left-0 z-10 shrink-0"
					style={{ width: TIME_COLUMN_WIDTH_PX }}
				>
					{hours.map((hour) => (
						<div
							key={hour}
							className="border-line text-fg-muted text-caption-strong border-t pt-1 text-center tabular-nums"
							style={{ height: toPx(HOUR_MS) }}
						>
							{new Date(hour).getHours()}
						</div>
					))}
				</div>
				{channels.map((channel) => (
					<div
						key={channel.id}
						className="border-line relative shrink-0 border-l"
						style={{ width: COLUMN_WIDTH_PX }}
					>
						{programs
							.filter((p) => p.serviceId === channel.id)
							.map((program) => (
								<ProgramCell
									key={program.id}
									program={program}
									dayStart={dayStart}
									dayEnd={dayEnd}
									now={now}
									onSelect={onSelect}
								/>
							))}
					</div>
				))}
				{showNow && (
					<div
						className="border-accent-strong pointer-events-none absolute right-0 left-0 z-10 border-t-2"
						style={{ top: toPx(now - dayStart) }}
					/>
				)}
			</div>
		</div>
	);
}

type CellProps = {
	program: Program;
	dayStart: number;
	dayEnd: number;
	now: number;
	onSelect: (program: Program) => void;
};

function ProgramCell({ program, dayStart, dayEnd, now, onSelect }: CellProps) {
	const end =
		program.duration == null ? program.startAt + HOUR_MS : program.startAt + program.duration;
	const top = toPx(Math.max(program.startAt, dayStart) - dayStart);
	const height = toPx(Math.min(end, dayEnd) - Math.max(program.startAt, dayStart));
	const ended = end <= now;
	const { className } = genreStyle(program.genres);

	return (
		<button
			type="button"
			className={`text-caption absolute right-0 left-0 overflow-hidden border-t border-l-2 px-1.5 py-1 text-left hover:brightness-150 ${className} ${ended ? "opacity-50" : ""}`}
			style={{ top, height }}
			onClick={() => {
				onSelect(program);
			}}
		>
			<span className="text-fg-muted text-caption-strong mr-1 tabular-nums">
				{formatTime(program.startAt)}
			</span>
			<span className="text-fg">{program.name}</span>
			{height > 48 && <span className="text-fg-muted mt-0.5 block">{program.description}</span>}
		</button>
	);
}
