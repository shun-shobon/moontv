import { clsx } from "clsx";

import type { Program } from "../../../shared/api/schemas";
import { formatTime } from "../../../shared/domain/time";
import { genreStyle } from "../domain/genre";
import { programBox, programEnd } from "../services/guide-layout";

type Props = {
	program: Program;
	dayStart: number;
	dayEnd: number;
	now: number;
	onSelect: (program: Program) => void;
};

export function ProgramCell({ program, dayStart, dayEnd, now, onSelect }: Props) {
	const { top, height, showsDescription } = programBox(program, dayStart, dayEnd);
	const ended = programEnd(program) <= now;
	const { className } = genreStyle(program.genres);

	return (
		<button
			type="button"
			className={clsx(
				"absolute right-0 left-0 overflow-hidden border-t border-l-2 px-1.5 py-1 text-left text-caption hover:brightness-150",
				className,
				ended && "opacity-50",
			)}
			style={{ top, height }}
			onClick={() => {
				onSelect(program);
			}}
		>
			<span className="mr-1 text-caption-strong text-fg-muted tabular-nums">
				{formatTime(program.startAt)}
			</span>
			<span className="text-fg">{program.name}</span>
			{showsDescription && (
				<span className="mt-0.5 block text-fg-muted">{program.description}</span>
			)}
		</button>
	);
}
