import "@videojs/react/i18n/locales/ja/register";
import { recordingPlaylistUrl } from "@moontv/core/api/urls";
import { I18nProvider } from "@videojs/react/i18n";
import { VideoPlayer } from "@videojs/react/video";
import { useState } from "react";

import { RecordingPlayerView } from "../components/RecordingPlayerView";
import type { NowPlaying } from "../media/media-session";
import { useMediaSession } from "./hooks/useMediaSession";
import { usePreferences } from "./hooks/usePreferences";

type Props = { programId: number; nowPlaying: NowPlaying };

/** 再読み込みはプレイヤーごと作り直し、壊れた再生状態を持ち越さない。 */
export function RecordingPlayer({ programId, nowPlaying }: Props) {
	const [preferences, updatePreferences] = usePreferences();
	const [attempt, setAttempt] = useState(0);
	const [failed, setFailed] = useState(false);
	useMediaSession(nowPlaying);

	return (
		<I18nProvider locale="ja">
			<VideoPlayer key={attempt}>
				<RecordingPlayerView
					src={recordingPlaylistUrl(programId)}
					captions={preferences.captions}
					onCaptionsChange={(captions) => {
						updatePreferences({ ...preferences, captions });
					}}
					ambient={preferences.ambient}
					failed={failed}
					onMediaError={() => {
						setFailed(true);
					}}
					onRetry={() => {
						setFailed(false);
						setAttempt((n) => n + 1);
					}}
				/>
			</VideoPlayer>
		</I18nProvider>
	);
}
