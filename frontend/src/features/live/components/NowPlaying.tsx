import type { Channel } from "@moontv/core/api/schemas";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { formatRange } from "@moontv/core/domain/time";

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
						{present.marks.length > 0 && <span className="ml-2">{formatMarks(present.marks)}</span>}
					</p>
					<p className="mt-1 text-body whitespace-pre-wrap text-fg-secondary">
						{present.description}
					</p>
				</>
			)}
		</div>
	);
}
