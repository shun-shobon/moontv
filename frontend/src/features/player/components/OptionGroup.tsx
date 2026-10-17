import { clsx } from "clsx";
import { Header, MenuItem, MenuSection } from "react-aria-components";

type Props<T extends string> = {
	label: string;
	options: readonly T[];
	value: T;
	format: (value: T) => string;
	onSelect: (value: T) => void;
};

/** Menu の中で使う。矢印キーでは選ばずに項目を移るだけなので、画質を見比べる途中で配信が切り替わらない。 */
export function OptionGroup<T extends string>({
	label,
	options,
	value,
	format,
	onSelect,
}: Props<T>) {
	return (
		<MenuSection
			selectionMode="single"
			disallowEmptySelection
			selectedKeys={[value]}
			onSelectionChange={(keys) => {
				const next = options.find((option) => keys !== "all" && keys.has(option));
				if (next !== undefined) {
					onSelect(next);
				}
			}}
			className="flex flex-col"
		>
			<Header className="px-2.5 pt-1.5 pb-1 text-caption text-fg-muted">{label}</Header>
			{options.map((option) => (
				<MenuItem
					key={option}
					id={option}
					textValue={format(option)}
					className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-fg-secondary transition-colors outline-none data-focused:bg-surface-hover data-focused:text-fg data-selected:text-fg"
				>
					{({ isSelected }) => (
						<>
							{format(option)}
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								aria-hidden
								className={clsx(
									"size-4 shrink-0 text-accent transition duration-200 ease-out",
									isSelected ? "scale-100 opacity-100" : "scale-50 opacity-0",
								)}
							>
								<path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</>
					)}
				</MenuItem>
			))}
		</MenuSection>
	);
}
