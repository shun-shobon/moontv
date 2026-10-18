import { Suspense, lazy, useMemo } from "react";

import { useChannels } from "../../../shared/api/queries";
import { channelArtworkUrl } from "../../../shared/api/urls";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { WatchLayout } from "../../../shared/components/WatchLayout";
import { recordingPath } from "../../../shared/services/routes";
import { PlayerPlaceholder } from "../../player/components/PlayerPlaceholder";
import { useDeleteRecording, useRecording, useRecordings } from "../api/queries";
import { DeleteRecordingButton } from "../components/DeleteRecordingButton";
import { ProgramCard } from "../components/ProgramCard";
import { RecordingDetail } from "../components/RecordingDetail";

/** Video.js は 700 kB 近くあるので、録画を開くときまで読み込まない。 */
const RecordingPlayer = lazy(async () => ({
	default: (await import("../../player/containers/RecordingPlayer")).RecordingPlayer,
}));

export function RecordingPlayerPage({ programId }: { programId: number }) {
	const recording = useRecording(programId);
	const recordings = useRecordings(true);
	const channels = useChannels();
	const deletion = useDeleteRecording();
	const channelById = useMemo(() => new Map(channels.data?.map((c) => [c.id, c])), [channels.data]);

	if (recording.isError) {
		return <StatusMessage>録画を取得できませんでした。</StatusMessage>;
	}
	if (recording.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}
	if (recording.data.state !== "ready") {
		return <StatusMessage>この録画はまだ再生できません。</StatusMessage>;
	}

	const { program } = recording.data;
	const channel = channelById.get(program.serviceId);
	const playable = (recordings.data ?? []).filter((r) => r.state === "ready");

	return (
		<WatchLayout
			player={
				<Suspense fallback={<PlayerPlaceholder />}>
					<RecordingPlayer
						programId={programId}
						nowPlaying={{
							title: program.name,
							artist: channel?.name ?? "",
							artworkUrl: channelArtworkUrl(channel),
						}}
					/>
				</Suspense>
			}
			info={
				<>
					<RecordingDetail recording={recording.data} channelName={channel?.name} />
					{/* 控えめなボタンは内側に余白があるので、文字の左端を番組情報に揃える。 */}
					<div className="-ml-4">
						<DeleteRecordingButton
							isPending={deletion.isPending}
							failed={deletion.isError}
							onDelete={() => {
								deletion.mutate(programId, {
									onSuccess: () => {
										navigation.navigate("/recordings", { history: "replace" });
									},
								});
							}}
						/>
					</div>
				</>
			}
			aside={
				<ul className="flex flex-col gap-2">
					{playable.map((r) => (
						<li key={r.program.id}>
							<ProgramCard
								program={r.program}
								channel={channelById.get(r.program.serviceId)}
								durationMs={r.durationMs}
								status={null}
								href={recordingPath(r.program.id)}
								active={r.program.id === programId}
								action={null}
							/>
						</li>
					))}
				</ul>
			}
		/>
	);
}
