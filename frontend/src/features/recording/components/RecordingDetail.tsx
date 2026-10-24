import type { Recording } from "@moontv/core/api/schemas";
import { formatDuration } from "@moontv/core/domain/duration";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { formatDate, formatRange } from "@moontv/core/domain/time";

type Props = { recording: Recording; channelName: string | undefined };

/** ライブの視聴画面の番組情報と同じ並びにする。 */
export function RecordingDetail({ recording: { program, durationMs }, channelName }: Props) {
	return (
		<div className="flex flex-col gap-1">
			<p className="text-label text-fg-muted">{channelName ?? "不明なチャンネル"}</p>
			<h1 className="text-title">{program.name}</h1>
			<p className="text-label text-fg-subtle tabular-nums">
				{formatDate(program.startAt)} {formatRange(program.startAt, program.duration)}
				{durationMs != null && <span className="ml-2">{formatDuration(durationMs)}</span>}
				{program.marks.length > 0 && <span className="ml-2">{formatMarks(program.marks)}</span>}
			</p>
			<p className="mt-1 text-body whitespace-pre-wrap text-fg-secondary">{program.description}</p>
		</div>
	);
}
