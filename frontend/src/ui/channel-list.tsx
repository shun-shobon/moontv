import { useState } from "react";

import { logoUrl } from "../api/client";
import type { Channel } from "../api/schemas";
import { formatRange, progressOf } from "../domain/time";
import { watchPath } from "./router";

const TYPE_LABELS: Record<string, string> = { GR: "地デジ", BS: "BS", CS: "CS", SKY: "スカパー" };

type Props = {
	channels: readonly Channel[];
	activeId: number | null;
	now: number;
	layout: "grid" | "list";
};

/** サブチャンネルは臨時編成のときしか放送しないので、放送中の番組がなければ出さない。 */
const isListed = (channel: Channel, activeId: number | null) =>
	!channel.isSubchannel || channel.present != null || channel.id === activeId;

export function ChannelList({ channels: allChannels, activeId, now, layout }: Props) {
	const channels = allChannels.filter((c) => isListed(c, activeId));
	const types = [...new Set(channels.map((c) => c.channelType))];
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const activeType = channels.find((c) => c.id === activeId)?.channelType;
	const currentType = selectedType ?? activeType ?? types[0];
	const visible = channels.filter((c) => c.channelType === currentType);

	return (
		<div className="flex min-h-0 flex-col gap-3">
			{types.length > 1 && (
				<div className="text-label flex gap-1" role="tablist">
					{types.map((type) => (
						<button
							key={type}
							type="button"
							role="tab"
							aria-selected={type === currentType}
							className={`rounded-md px-3 py-1.5 ${type === currentType ? "bg-selected text-fg" : "text-fg-muted hover:text-fg"}`}
							onClick={() => {
								setSelectedType(type);
							}}
						>
							{TYPE_LABELS[type] ?? type}
						</button>
					))}
				</div>
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

function ChannelCard({ channel, active, now }: { channel: Channel; active: boolean; now: number }) {
	const { present, following } = channel;
	const progress = present == null ? null : progressOf(present.startAt, present.duration, now);
	const frame = active
		? "bg-selected ring-accent/40"
		: "bg-surface ring-line hover:bg-surface-hover";

	return (
		<a
			href={watchPath(channel.id)}
			aria-current={active ? "page" : undefined}
			className={`flex flex-col gap-2 rounded-xl p-3 ring-1 transition-colors ring-inset ${frame}`}
		>
			<div className="flex items-center gap-3">
				<ChannelBadge channel={channel} />
				<span className="text-subtitle truncate">{channel.name}</span>
			</div>
			{present == null ? (
				<p className="text-fg-subtle text-label">番組情報なし</p>
			) : (
				<div className="flex flex-col gap-1">
					<p className="text-fg text-label line-clamp-2">{present.name}</p>
					<p className="text-fg-subtle text-caption tabular-nums">
						{formatRange(present.startAt, present.duration)}
					</p>
					{progress != null && (
						<div className="bg-track h-1 overflow-hidden rounded-full">
							<div className="bg-accent-strong h-full" style={{ width: `${progress * 100}%` }} />
						</div>
					)}
				</div>
			)}
			{following != null && (
				<p className="text-fg-subtle text-caption truncate">次: {following.name}</p>
			)}
		</a>
	);
}

function ChannelBadge({ channel }: { channel: Channel }) {
	if (channel.hasLogo) {
		return <img src={logoUrl(channel.id)} alt="" className="h-6 w-auto shrink-0 rounded-sm" />;
	}
	return (
		<span className="bg-selected text-fg-secondary text-caption-strong flex h-6 min-w-8 shrink-0 items-center justify-center rounded-md px-1.5 tabular-nums">
			{channel.remoteControlKeyId ?? channel.channel}
		</span>
	);
}
