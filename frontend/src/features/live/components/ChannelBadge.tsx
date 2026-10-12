import type { Channel } from "../../../shared/api/schemas";
import { logoUrl } from "../api/urls";

export function ChannelBadge({ channel }: { channel: Channel }) {
	if (channel.hasLogo) {
		return <img src={logoUrl(channel.id)} alt="" className="h-6 w-auto shrink-0 rounded-sm" />;
	}
	return (
		<span className="flex h-6 min-w-8 shrink-0 items-center justify-center rounded-md bg-selected px-1.5 text-caption-strong text-fg-secondary tabular-nums">
			{channel.remoteControlKeyId ?? channel.channel}
		</span>
	);
}
