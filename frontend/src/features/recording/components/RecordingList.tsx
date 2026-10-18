import { clsx } from "clsx";

import { Button } from "../../../shared/components/Button";
import { ButtonLink } from "../../../shared/components/ButtonLink";
import { formatDate, formatRange } from "../../../shared/domain/time";
import { recordingPath } from "../../../shared/services/routes";
import type { Recording } from "../api/schemas";
import { formatDuration } from "../domain/duration";

type Props = {
	recordings: readonly Recording[];
	channelNames: ReadonlyMap<number, string>;
	/** 削除の確認を出している録画。 */
	confirmingId: number | null;
	deletingId: number | null;
	failedId: number | null;
	onDeleteRequest: (programId: number | null) => void;
	onDelete: (programId: number) => void;
};

const STATE_TEXT = {
	recording: "録画中",
	converting: "変換中",
	failed: "変換に失敗しました",
} as const;

const statusText = ({ state, durationMs }: Recording) => {
	if (state === "ready") {
		return durationMs == null ? "" : formatDuration(durationMs);
	}
	return STATE_TEXT[state];
};

export function RecordingList({
	recordings,
	channelNames,
	confirmingId,
	deletingId,
	failedId,
	onDeleteRequest,
	onDelete,
}: Props) {
	if (recordings.length === 0) {
		return (
			<p className="py-8 text-center text-label text-fg-muted">
				録画はまだありません。録画が終わると変換してここに並びます。
			</p>
		);
	}

	return (
		<ul className="flex flex-col divide-y divide-line">
			{recordings.map((recording) => {
				const { program, state } = recording;
				const deletable = state === "ready" || state === "failed";
				return (
					<li key={program.id} className="flex items-center gap-3 py-3">
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<p className="text-caption text-fg-muted">
								{channelNames.get(program.serviceId)} ・ {formatDate(program.startAt)}{" "}
								{formatRange(program.startAt, program.duration)}
							</p>
							<p className="truncate text-label text-fg">{program.name}</p>
							<p
								className={clsx(
									"text-caption",
									state === "ready" || state === "failed" ? "text-fg-muted" : "text-accent",
								)}
							>
								{statusText(recording)}
								{failedId === program.id && (
									<span role="alert" className="ml-2">
										削除できませんでした
									</span>
								)}
							</p>
						</div>
						{state === "ready" && confirmingId !== program.id && (
							<ButtonLink variant="quiet" href={recordingPath(program.id)}>
								再生
							</ButtonLink>
						)}
						{deletable &&
							(confirmingId === program.id ? (
								<div className="flex shrink-0 gap-1">
									<Button
										variant="quiet"
										onPress={() => {
											onDeleteRequest(null);
										}}
									>
										やめる
									</Button>
									<Button
										variant="primary"
										isPending={deletingId === program.id}
										onPress={() => {
											onDelete(program.id);
										}}
									>
										削除する
									</Button>
								</div>
							) : (
								<Button
									variant="quiet"
									onPress={() => {
										onDeleteRequest(program.id);
									}}
								>
									削除
								</Button>
							))}
					</li>
				);
			})}
		</ul>
	);
}
