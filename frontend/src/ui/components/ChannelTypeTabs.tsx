import { clsx } from "clsx";

import { channelTypeLabel } from "../services/channel-list";

type Props = {
	types: readonly string[];
	current: string | undefined;
	onSelect: (type: string) => void;
};

export function ChannelTypeTabs({ types, current, onSelect }: Props) {
	return (
		<div className="flex gap-1 text-label" role="tablist">
			{types.map((type) => (
				<button
					key={type}
					type="button"
					role="tab"
					aria-selected={type === current}
					className={clsx(
						"rounded-md px-3 py-1.5",
						type === current ? "bg-selected text-fg" : "text-fg-muted hover:text-fg",
					)}
					onClick={() => {
						onSelect(type);
					}}
				>
					{channelTypeLabel(type)}
				</button>
			))}
		</div>
	);
}
