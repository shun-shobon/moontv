import "@videojs/react/i18n/locales/ja/register";
import type { Audio, AudioTrack, Status } from "@moontv/core/api/schemas";
import { masterPlaylistUrl } from "@moontv/core/api/urls";
import { useLiveSession } from "@moontv/core/hooks/useLiveSession";
import { resolveCodec, resolveQuality } from "@moontv/core/services/stream-selection";
import { I18nProvider } from "@videojs/react/i18n";
import { LiveVideoPlayer } from "@videojs/react/live-video";
import { useState } from "react";

import { LivePlayerView } from "../components/LivePlayerView";
import { browserSupports } from "../media/codec-support";
import type { NowPlaying } from "../media/media-session";
import { createViewerId } from "../media/viewer-id";
import { useLeaveOnPageHide } from "./hooks/useLeaveOnPageHide";
import { useMediaSession } from "./hooks/useMediaSession";
import { usePreferences } from "./hooks/usePreferences";

type Props = {
	serviceId: number;
	status: Status;
	nowPlaying: NowPlaying | undefined;
	audios: readonly Audio[];
};

export function LivePlayer({ serviceId, status, nowPlaying, audios }: Props) {
	const [preferences, updatePreferences] = usePreferences();
	const codec = resolveCodec(preferences.codec, status, browserSupports);
	const quality = resolveQuality(preferences.quality, status);
	const [attempt, setAttempt] = useState(0);
	const [viewerId] = useState(createViewerId);
	// 選んだ音声はそのチャンネルの間だけ使い、チャンネルを変えたら主音声に戻す。
	const [audioChoice, setAudioChoice] = useState<{ serviceId: number; audio: AudioTrack }>();
	const audio = audioChoice?.serviceId === serviceId ? audioChoice.audio : "main";
	const target = { serviceId, codec, quality, audio, viewerId };
	const session = useLiveSession(target, attempt);
	useLeaveOnPageHide(target);
	useMediaSession(nowPlaying);

	return (
		<I18nProvider locale="ja">
			{/* 再読み込みはプレイヤーごと作り直し、壊れた再生状態を持ち越さない。 */}
			<LiveVideoPlayer key={attempt}>
				<LivePlayerView
					phase={session.phase}
					sourceKey={session.key}
					src={masterPlaylistUrl(target)}
					settings={{
						qualities: status.qualities,
						codecs: status.codecs,
						activeCodec: codec,
						preferences,
						onChange: updatePreferences,
						audios,
						audio,
						onAudioChange: (next) => {
							setAudioChoice({ serviceId, audio: next });
						},
					}}
					onMediaError={session.reportMediaError}
					onRetry={() => {
						setAttempt((n) => n + 1);
					}}
				/>
			</LiveVideoPlayer>
		</I18nProvider>
	);
}
