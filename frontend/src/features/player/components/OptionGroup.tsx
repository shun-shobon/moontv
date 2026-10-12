import { clsx } from "clsx";

type Props<T extends string> = {
	label: string;
	options: readonly T[];
	value: T;
	format: (value: T) => string;
	onSelect: (value: T) => void;
};

export function OptionGroup<T extends string>({
	label,
	options,
	value,
	format,
	onSelect,
}: Props<T>) {
	return (
		<fieldset className="flex flex-col gap-1">
			<legend className="mb-1 text-caption text-fg-muted">{label}</legend>
			{options.map((option) => {
				const active = option === value;
				return (
					<button
						key={option}
						type="button"
						aria-pressed={active}
						className={clsx(
							"flex items-center justify-between rounded-md px-2 py-1.5 text-left",
							active ? "bg-selected text-fg" : "text-fg-secondary hover:bg-surface-hover",
						)}
						onClick={() => {
							onSelect(option);
						}}
					>
						{format(option)}
						{active && <span aria-hidden>✓</span>}
					</button>
				);
			})}
		</fieldset>
	);
}
