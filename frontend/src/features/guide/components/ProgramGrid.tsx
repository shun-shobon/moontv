import type { Channel, Program } from "../../../shared/api/schemas";
import {
	COLUMN_WIDTH_PX,
	DAY_HEIGHT_PX,
	HOUR_HEIGHT_PX,
	TIME_COLUMN_WIDTH_PX,
	gridWidth,
	hourMarks,
	nowLineTop,
} from "../services/guide-layout";
import { ProgramCell } from "./ProgramCell";

type Props = {
	channels: readonly Channel[];
	programs: readonly Program[];
	dayStart: number;
	dayEnd: number;
	now: number;
	onSelect: (program: Program) => void;
};

export function ProgramGrid({ channels, programs, dayStart, dayEnd, now, onSelect }: Props) {
	const nowTop = nowLineTop(dayStart, dayEnd, now);

	return (
		<div className="relative" style={{ width: gridWidth(channels.length) }}>
			<div className="sticky top-0 z-20 flex border-b border-line bg-canvas">
				<div
					className="sticky left-0 z-30 shrink-0 bg-canvas"
					style={{ width: TIME_COLUMN_WIDTH_PX }}
				/>
				{channels.map((channel) => (
					<div
						key={channel.id}
						className="shrink-0 truncate border-l border-line px-2 py-2 text-center text-caption-strong"
						style={{ width: COLUMN_WIDTH_PX }}
					>
						{channel.name}
					</div>
				))}
			</div>
			<div className="relative flex" style={{ height: DAY_HEIGHT_PX }}>
				<div
					className="sticky left-0 z-10 shrink-0 bg-canvas"
					style={{ width: TIME_COLUMN_WIDTH_PX }}
				>
					{hourMarks(dayStart).map((hour) => (
						<div
							key={hour}
							className="border-t border-line pt-1 text-center text-caption-strong text-fg-muted tabular-nums"
							style={{ height: HOUR_HEIGHT_PX }}
						>
							{new Date(hour).getHours()}
						</div>
					))}
				</div>
				{channels.map((channel) => (
					<div
						key={channel.id}
						className="relative shrink-0 border-l border-line"
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
				{nowTop != null && (
					<div
						className="pointer-events-none absolute right-0 left-0 z-10 border-t-2 border-accent-strong"
						style={{ top: nowTop }}
					/>
				)}
			</div>
		</div>
	);
}
