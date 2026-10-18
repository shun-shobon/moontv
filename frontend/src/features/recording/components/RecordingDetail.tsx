import { formatMarks } from "../../../shared/domain/program-marks";
import { formatDate, formatRange } from "../../../shared/domain/time";
import type { Recording } from "../api/schemas";
import { formatDuration } from "../domain/duration";

type Props = { recording: Recording; channelName: string | undefined };

export function RecordingDetail({ recording: { program, durationMs }, channelName }: Props) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-label text-fg-muted">
				{channelName} ・ {formatDate(program.startAt)}{" "}
				{formatRange(program.startAt, program.duration)}
				{durationMs != null && <span className="ml-2">（{formatDuration(durationMs)}）</span>}
			</p>
			<h1 className="text-title">
				{program.name}
				{program.marks.length > 0 && (
					<span className="ml-2 text-caption text-fg-subtle">{formatMarks(program.marks)}</span>
				)}
			</h1>
			<p className="text-body whitespace-pre-wrap text-fg-secondary">{program.description}</p>
		</div>
	);
}
