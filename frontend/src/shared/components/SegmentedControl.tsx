import type { Key } from "react-aria-components";
import { SelectionIndicator, ToggleButton, ToggleButtonGroup } from "react-aria-components";

type Props<T extends Key> = {
	label: string;
	options: readonly T[];
	value: T | undefined;
	format: (value: T) => string;
	onChange: (value: T) => void;
	className?: string;
};

export function SegmentedControl<T extends Key>({
	label,
	options,
	value,
	format,
	onChange,
	className,
}: Props<T>) {
	return (
		<ToggleButtonGroup
			aria-label={label}
			selectionMode="single"
			disallowEmptySelection
			selectedKeys={value === undefined ? [] : [value]}
			onSelectionChange={(keys) => {
				const next = options.find((option) => keys.has(option));
				// 選択中の項目を押しても同じ値で呼ばれるため。
				if (next !== undefined && next !== value) {
					onChange(next);
				}
			}}
			className={className}
		>
			{options.map((option) => (
				<ToggleButton
					key={option}
					id={option}
					className="relative shrink-0 rounded-lg px-3 py-1.5 text-label text-fg-muted focus-ring transition-[color,scale] duration-150 data-hovered:text-fg data-pressed:scale-96 data-selected:text-fg"
				>
					<SelectionIndicator className="absolute inset-0 rounded-lg bg-selected ring-1 ring-line-strong transition-[translate,width] duration-300 ease-out ring-inset" />
					<span className="relative">{format(option)}</span>
				</ToggleButton>
			))}
		</ToggleButtonGroup>
	);
}
