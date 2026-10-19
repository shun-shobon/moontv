import { SwitchButton, SwitchField, Text } from "react-aria-components";

type Props = {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
};

/**
 * 小さなスイッチだけでなく行のどこを押しても切り替わるよう、説明も含めて行全体をラベルにする。
 * そのままでは説明までスイッチの名前に入るので、名前は aria-label で与える。
 */
export function SwitchRow({ label, description, checked, onChange }: Props) {
	return (
		<SwitchField isSelected={checked} onChange={onChange} aria-label={label}>
			<SwitchButton className="group flex cursor-pointer items-center justify-between gap-6 p-4">
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className="text-label text-fg">{label}</span>
					{description != null && (
						<Text slot="description" className="text-caption text-fg-muted">
							{description}
						</Text>
					)}
				</span>
				<span
					aria-hidden
					className="flex h-6 w-10 shrink-0 items-center rounded-full bg-line-strong p-0.5 outline-2 outline-offset-2 outline-transparent transition-colors duration-200 group-data-focus-visible:outline-fg-accent group-data-selected:bg-accent"
				>
					<span className="size-5 rounded-full bg-fg shadow transition-transform duration-200 ease-out group-data-pressed:scale-90 group-data-selected:translate-x-4" />
				</span>
			</SwitchButton>
		</SwitchField>
	);
}
