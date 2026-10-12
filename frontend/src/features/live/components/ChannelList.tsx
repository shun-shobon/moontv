import { useState } from "react";

import type { Channel } from "../../../shared/api/schemas";
import { channelTypes, currentChannelType, listedChannels } from "../services/channel-list";
import { ChannelCard } from "./ChannelCard";
import { ChannelTypeTabs } from "./ChannelTypeTabs";

type Props = {
	channels: readonly Channel[];
	activeId: number | null;
	now: number;
	layout: "grid" | "list";
};

export function ChannelList({ channels: allChannels, activeId, now, layout }: Props) {
	const channels = listedChannels(allChannels, activeId);
	const types = channelTypes(channels);
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const currentType = currentChannelType(channels, selectedType, activeId);
	const visible = channels.filter((c) => c.channelType === currentType);

	return (
		<div className="flex min-h-0 flex-col gap-3">
			{types.length > 1 && (
				<ChannelTypeTabs types={types} current={currentType} onSelect={setSelectedType} />
			)}
			<ul
				className={
					layout === "grid"
						? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
						: "flex flex-col gap-2"
				}
			>
				{visible.map((channel) => (
					<li key={channel.id}>
						<ChannelCard channel={channel} active={channel.id === activeId} now={now} />
					</li>
				))}
			</ul>
		</div>
	);
}
