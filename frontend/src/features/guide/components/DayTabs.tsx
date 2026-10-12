import { clsx } from "clsx";

import { formatDate } from "../../../shared/domain/time";

type Props = {
	days: readonly number[];
	current: number;
	onSelect: (day: number) => void;
};

export function DayTabs({ days, current, onSelect }: Props) {
	return (
		<div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 py-2 text-label">
			{days.map((day) => (
				<button
					key={day}
					type="button"
					aria-pressed={day === current}
					className={clsx(
						"shrink-0 rounded-md px-3 py-1.5",
						day === current ? "bg-selected text-fg" : "text-fg-muted hover:text-fg",
					)}
					onClick={() => {
						onSelect(day);
					}}
				>
					{formatDate(day)}
				</button>
			))}
		</div>
	);
}
