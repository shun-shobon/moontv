import type { AudioTrack, Channel, Status } from "@moontv/core/api/schemas";
import { masterPlaylistUrl } from "@moontv/core/api/urls";
import { useLiveSession } from "@moontv/core/hooks/useLiveSession";
import { audioOptionLabel } from "@moontv/core/services/player-settings";
import { resolveCodec, resolveQuality } from "@moontv/core/services/stream-selection";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HostInstance } from "react-native";
import { Pressable, StyleSheet, useTVEventHandler } from "react-native";

import { PlayerView, supportsCodec } from "../../../../modules/player";
import { Button } from "../../../shared/components/Button";
import { usePreferences } from "../../../shared/containers/hooks/usePreferences";
import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { remoteKeyUp } from "../../../shared/services/remote";
import { requestTVFocus } from "../../../shared/services/tv-focus";
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
	onExit: () => void;
};

export function LivePlayer({ channel, status, onZap, onExit }: Props) {
	const [preferences, updatePreferences] = usePreferences();
	const codec = resolveCodec(preferences.codec, status, supportsCodec);
	const quality = resolveQuality(preferences.quality, status);
	const [viewerId] = useState(createViewerId);
	const [attempt, setAttempt] = useState(0);
	// 選んだ音声はそのチャンネルの間だけ使い、チャンネルを変えたら主音声に戻す。
	const [audioChoice, setAudioChoice] = useState<{ serviceId: number; audio: AudioTrack }>();
	const audio = audioChoice?.serviceId === channel.id ? audioChoice.audio : "main";
	const target = { serviceId: channel.id, codec, quality, audio, viewerId };
	const session = useLiveSession(target, attempt);
	const [bannerVisible, showBanner] = useTransientVisibility(BANNER_DURATION_MS, channel.id);
	const [menuOpen, setMenuOpen] = useState(false);
	const rootRef = useRef<HostInstance>(null);
	const audios = channel.present?.audios ?? [];

	// Android はフォーカスのあるビューにしかキーを配らない。フォーカスを持つボタンが消えたら画面に戻す。
	const hasButton = menuOpen || session.phase.kind === "error";
	useEffect(() => {
		if (!hasButton) {
			requestTVFocus(rootRef.current);
		}
	}, [hasButton]);

	const closeMenu = useCallback(() => {
		setMenuOpen(false);
		showBanner();
	}, [showBanner]);
	useBackHandler(menuOpen ? closeMenu : onExit);

	useTVEventHandler((event) => {
		const key = remoteKeyUp(event);
		if (menuOpen) {
			return;
		}
		if (key === "up" || key === "channelUp") {
			onZap(1);
		} else if (key === "down" || key === "channelDown") {
			onZap(-1);
		} else if (key === "info") {
			showBanner();
		}
	});

	return (
		<Pressable
			ref={rootRef}
			hasTVPreferredFocus
			onPress={() => {
				setMenuOpen(true);
			}}
			style={styles.container}
		>
			<PlayerView
				key={session.key}
				source={session.phase.kind === "playing" ? masterPlaylistUrl(target) : null}
				showCaption={preferences.captions}
				onPlaybackError={session.reportMediaError}
				style={StyleSheet.absoluteFill}
			/>
			<PlayerStatus
				phase={session.phase}
				onRetry={() => {
					setAttempt((n) => n + 1);
				}}
			/>
			{(bannerVisible || menuOpen) && (
				<ChannelBanner
					channel={channel}
					actions={
						menuOpen && (
							<>
								<Button
									label={preferences.captions ? "字幕：オン" : "字幕：オフ"}
									hasTVPreferredFocus
									onPress={() => {
										updatePreferences({ ...preferences, captions: !preferences.captions });
									}}
								/>
								{audios.length > 1 && (
									<Button
										label={audioOptionLabel(audio, audios)}
										onPress={() => {
											setAudioChoice({
												serviceId: channel.id,
												audio: audio === "main" ? "sub" : "main",
											});
										}}
									/>
								)}
							</>
						)
					}
				/>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.video },
});
