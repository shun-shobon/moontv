import "@videojs/react/i18n/locales/ja/register";
import { I18nProvider } from "@videojs/react/i18n";
import { LiveVideoPlayer } from "@videojs/react/live-video";
import { useState } from "react";

import type { Codec, Quality } from "../../api/schemas";
import { masterPlaylistUrl } from "../../api/urls";
import { createViewerId } from "../../media/viewer-id";
import { LivePlayerView } from "../components/LivePlayerView";
import type { PlayerSettingsProps } from "../components/PlayerSettings";
import { useLiveSession } from "./hooks/useLiveSession";

type Props = {
	serviceId: number;
	codec: Codec;
	quality: Quality;
	settings: PlayerSettingsProps;
};

/** 再読み込みはプレイヤーごと作り直し、壊れた再生状態を持ち越さない。 */
export function LivePlayer({ serviceId, codec, quality, settings }: Props) {
	const [attempt, setAttempt] = useState(0);
	const [viewerId] = useState(createViewerId);
	const target = { serviceId, codec, quality, viewerId };
	const session = useLiveSession(target, attempt);

	return (
		<I18nProvider locale="ja">
			<LiveVideoPlayer key={attempt}>
				<LivePlayerView
					phase={session.phase}
					sourceKey={session.key}
					src={masterPlaylistUrl(target)}
					settings={settings}
					onMediaError={session.reportMediaError}
					onRetry={() => {
						setAttempt((n) => n + 1);
					}}
				/>
			</LiveVideoPlayer>
		</I18nProvider>
	);
}
