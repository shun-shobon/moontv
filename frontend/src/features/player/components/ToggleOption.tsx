import { clsx } from "clsx";

type Props = {
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
};

export function ToggleOption({ label, checked, onToggle }: Props) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-fg-secondary hover:bg-surface-hover"
			onClick={() => {
				onToggle(!checked);
			}}
		>
			{label}
			<span
				aria-hidden
				className={clsx(
					"flex h-4 w-7 items-center rounded-full p-0.5",
					checked ? "justify-end bg-accent" : "justify-start bg-line-strong",
				)}
			>
				<span className="size-3 rounded-full bg-fg" />
			</span>
		</button>
	);
}
