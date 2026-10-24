import type { Channel, Status } from "@moontv/core/api/schemas";
import { masterPlaylistUrl } from "@moontv/core/api/urls";
import { DEFAULT_PLAYBACK_PREFERENCES } from "@moontv/core/domain/preferences";
import { useLiveSession } from "@moontv/core/hooks/useLiveSession";
import { resolveCodec, resolveQuality } from "@moontv/core/services/stream-selection";
import { useState } from "react";
import { Pressable, StyleSheet, useTVEventHandler } from "react-native";

import { PlayerView, supportsCodec } from "../../../../modules/player";
import { remoteKeyUp } from "../../../shared/services/remote";
import { colors } from "../../../shared/theme";
import { ChannelBanner } from "../components/ChannelBanner";
import { PlayerStatus } from "../components/PlayerStatus";
import { useTransientVisibility } from "../hooks/useTransientVisibility";
import { createViewerId } from "../media/viewer-id";

const BANNER_DURATION_MS = 5000;

type Props = {
	channel: Channel;
	status: Status;
	/** 1 で次、-1 で前のチャンネル。 */
	onZap: (direction: 1 | -1) => void;
};

export function LivePlayer({ channel, status, onZap }: Props) {
	const preferences = DEFAULT_PLAYBACK_PREFERENCES;
	const codec = resolveCodec(preferences.codec, status, supportsCodec);
	const quality = resolveQuality(preferences.quality, status);
	const [viewerId] = useState(createViewerId);
	const [attempt, setAttempt] = useState(0);
	const target = { serviceId: channel.id, codec, quality, audio: "main", viewerId } as const;
	const session = useLiveSession(target, attempt);
	const [bannerVisible, showBanner] = useTransientVisibility(BANNER_DURATION_MS, channel.id);

	useTVEventHandler((event) => {
		switch (remoteKeyUp(event)) {
			case "up":
			case "channelUp": {
				onZap(1);
				break;
			}
			case "down":
			case "channelDown": {
				onZap(-1);
				break;
			}
			case "info": {
				showBanner();
				break;
			}
			default:
		}
	});

	// Android はフォーカスのあるビューにしかキーを配らないため、画面全体でフォーカスを受ける。
	return (
		<Pressable hasTVPreferredFocus onPress={showBanner} style={styles.container}>
			<PlayerView
				key={session.key}
				source={session.phase.kind === "playing" ? masterPlaylistUrl(target) : null}
				onPlaybackError={session.reportMediaError}
				style={StyleSheet.absoluteFill}
			/>
			<PlayerStatus
				phase={session.phase}
				onRetry={() => {
					setAttempt((n) => n + 1);
				}}
			/>
			{bannerVisible && <ChannelBanner channel={channel} />}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.video },
});
