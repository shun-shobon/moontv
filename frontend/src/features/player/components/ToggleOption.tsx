import { clsx } from "clsx";
import { MenuItem, MenuSection } from "react-aria-components";

type Props = {
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
};

const ITEM_ID = "toggle";

/** Menu の中で使う。切り替えても Menu を閉じず、スイッチが動く様子を見せる。 */
export function ToggleOption({ label, checked, onToggle }: Props) {
	return (
		<MenuSection
			aria-label={label}
			selectionMode="multiple"
			selectedKeys={checked ? [ITEM_ID] : []}
			onSelectionChange={(keys) => {
				onToggle(keys === "all" || keys.has(ITEM_ID));
			}}
			className="flex flex-col"
		>
			<MenuItem
				id={ITEM_ID}
				textValue={label}
				className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-fg-secondary transition-colors outline-none data-focused:bg-surface-hover data-focused:text-fg"
			>
				{({ isSelected }) => (
					<>
						{label}
						<span
							aria-hidden
							className={clsx(
								"flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200",
								isSelected ? "bg-accent" : "bg-line-strong",
							)}
						>
							<span
								className={clsx(
									"size-3.5 rounded-full bg-fg shadow transition-transform duration-200 ease-out",
									isSelected && "translate-x-3.5",
								)}
							/>
						</span>
					</>
				)}
			</MenuItem>
		</MenuSection>
	);
}
