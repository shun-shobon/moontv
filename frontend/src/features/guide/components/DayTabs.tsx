import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { formatDate } from "../../../shared/domain/time";

type Props = {
	days: readonly number[];
	current: number;
	onSelect: (day: number) => void;
};

export function DayTabs({ days, current, onSelect }: Props) {
	return (
		<SegmentedControl
			label="日付"
			options={days}
			value={current}
			format={formatDate}
			onChange={onSelect}
			className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-4 py-2"
		/>
	);
}
