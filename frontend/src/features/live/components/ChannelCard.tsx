import { clsx } from "clsx";
import { Link } from "react-aria-components";

import type { Channel } from "../../../shared/api/schemas";
import { formatRange } from "../../../shared/domain/time";
import { watchPath } from "../../../shared/services/routes";
import { ChannelBadge } from "./ChannelBadge";

type Props = { channel: Channel; active: boolean };

export function ChannelCard({ channel, active }: Props) {
	const { present, following } = channel;

	return (
		<Link
			href={watchPath(channel.id)}
			aria-current={active ? "page" : undefined}
			className={clsx(
				"flex flex-col gap-2 rounded-xl p-3 ring-1 focus-ring transition duration-200 ease-out ring-inset data-pressed:scale-[0.98]",
				active
					? "bg-selected ring-accent/40"
					: "bg-surface ring-line data-hovered:bg-surface-hover",
			)}
		>
			<div className="flex items-center gap-3">
				<ChannelBadge channel={channel} />
				<span className="truncate text-subtitle">{channel.name}</span>
			</div>
			{present == null ? (
				<p className="text-label text-fg-subtle">番組情報なし</p>
			) : (
				<div className="flex flex-col gap-1">
					<p className="line-clamp-2 text-label text-fg">{present.name}</p>
					<p className="text-caption text-fg-subtle tabular-nums">
						{formatRange(present.startAt, present.duration)}
					</p>
				</div>
			)}
			{following != null && (
				<p className="truncate text-caption text-fg-subtle">次: {following.name}</p>
			)}
		</Link>
	);
}
