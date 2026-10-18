import { clsx } from "clsx";
import { Link } from "react-aria-components";

import type { Channel } from "../../../shared/api/schemas";
import { ChannelBadge } from "../../../shared/components/ChannelBadge";
import { formatMarks } from "../../../shared/domain/program-marks";
import { formatRange } from "../../../shared/domain/time";
import { cardClassName } from "../../../shared/services/card-style";
import { watchPath } from "../../../shared/services/routes";

type Props = { channel: Channel; active: boolean };

export function ChannelCard({ channel, active }: Props) {
	const { present, following } = channel;

	return (
		<Link
			href={watchPath(channel.id)}
			aria-current={active ? "page" : undefined}
			className={clsx("flex flex-col gap-2", cardClassName({ active, press: "self" }))}
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
						{present.marks.length > 0 && <span className="ml-2">{formatMarks(present.marks)}</span>}
					</p>
				</div>
			)}
			{following != null && (
				<p className="truncate text-caption text-fg-subtle">次: {following.name}</p>
			)}
		</Link>
	);
}
