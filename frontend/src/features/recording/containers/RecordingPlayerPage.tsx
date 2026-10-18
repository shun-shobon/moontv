import { Suspense, lazy, useMemo } from "react";

import { useChannels } from "../../../shared/api/queries";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { logoUrl } from "../../live/api/urls";
import { PlayerPlaceholder } from "../../player/components/PlayerPlaceholder";
import type { NowPlaying } from "../../player/media/media-session";
import { useRecording } from "../api/queries";
import { RecordingDetail } from "../components/RecordingDetail";

/** Video.js は 700 kB 近くあるので、録画を開くときまで読み込まない。 */
const RecordingPlayer = lazy(async () => ({
	default: (await import("../../player/containers/RecordingPlayer")).RecordingPlayer,
}));

const APP_ICON_URL = "/icon-512.png";

export function RecordingPlayerPage({ programId }: { programId: number }) {
	const recording = useRecording(programId);
	const channels = useChannels();
	const channel = channels.data?.find((c) => c.id === recording.data?.program.serviceId);
	const nowPlaying = useMemo<NowPlaying | null>(
		() =>
			recording.data == null
				? null
				: {
						title: recording.data.program.name,
						artist: channel?.name ?? "",
						artworkUrl: channel == null || !channel.hasLogo ? APP_ICON_URL : logoUrl(channel.id),
					},
		[recording.data, channel],
	);

	if (recording.isError) {
		return <StatusMessage>録画を取得できませんでした。</StatusMessage>;
	}
	if (recording.data == null || nowPlaying == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}
	if (recording.data.state !== "ready") {
		return <StatusMessage>この録画はまだ再生できません。</StatusMessage>;
	}

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:p-4">
			<Suspense fallback={<PlayerPlaceholder />}>
				<RecordingPlayer programId={programId} nowPlaying={nowPlaying} />
			</Suspense>
			<div className="px-4 lg:px-0">
				<RecordingDetail recording={recording.data} channelName={channel?.name} />
			</div>
		</div>
	);
}
