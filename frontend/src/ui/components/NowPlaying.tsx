import type { Channel } from "../../api/schemas";
import { formatRange } from "../../domain/time";

export function NowPlaying({ channel }: { channel: Channel | undefined }) {
	const present = channel?.present;

	return (
		<div className="flex flex-col gap-1">
			<p className="text-label text-fg-muted">{channel?.name ?? "不明なチャンネル"}</p>
			{present != null && (
				<>
					<h1 className="text-title">{present.name}</h1>
					<p className="text-label text-fg-subtle tabular-nums">
						{formatRange(present.startAt, present.duration)}
					</p>
					<p className="mt-1 text-body whitespace-pre-wrap text-fg-secondary">
						{present.description}
					</p>
				</>
			)}
		</div>
	);
}
