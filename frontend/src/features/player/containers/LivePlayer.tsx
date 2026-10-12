import "@videojs/react/i18n/locales/ja/register";
import { I18nProvider } from "@videojs/react/i18n";
import { LiveVideoPlayer } from "@videojs/react/live-video";
import { useState } from "react";

import type { Status } from "../../../shared/api/schemas";
import { masterPlaylistUrl } from "../api/urls";
import { LivePlayerView } from "../components/LivePlayerView";
import { browserSupports } from "../media/codec-support";
import type { NowPlaying } from "../media/media-session";
import { createViewerId } from "../media/viewer-id";
import { resolveCodec, resolveQuality } from "../services/stream-selection";
import { useLiveSession } from "./hooks/useLiveSession";
import { useMediaSession } from "./hooks/useMediaSession";
import { usePreferences } from "./hooks/usePreferences";

type Props = {
	serviceId: number;
	status: Status;
	nowPlaying: NowPlaying | undefined;
};

/** 再読み込みはプレイヤーごと作り直し、壊れた再生状態を持ち越さない。 */
export function LivePlayer({ serviceId, status, nowPlaying }: Props) {
	const [preferences, updatePreferences] = usePreferences();
	const codec = resolveCodec(preferences.codec, status, browserSupports);
	const quality = resolveQuality(preferences.quality, status);
	const [attempt, setAttempt] = useState(0);
	const [viewerId] = useState(createViewerId);
	const target = { serviceId, codec, quality, viewerId };
	const session = useLiveSession(target, attempt);
	useMediaSession(nowPlaying);

	return (
		<I18nProvider locale="ja">
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
