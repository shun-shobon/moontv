import { useChannels, useRecording } from "@moontv/core/api/queries";
import { recordingPlaylistUrl } from "@moontv/core/api/urls";
import { formatDate, formatRange } from "@moontv/core/domain/time";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HostInstance } from "react-native";
import { Pressable, StyleSheet, Text, useTVEventHandler, View } from "react-native";

import type { PlayerViewHandle, Progress } from "../../../../modules/player";
import { PlayerView } from "../../../../modules/player";
import { Button } from "../../../shared/components/Button";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { usePreferences } from "../../../shared/containers/hooks/usePreferences";
import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { useTransientVisibility } from "../../../shared/hooks/useTransientVisibility";
import { remoteKeyRepeating, remoteKeyUp } from "../../../shared/services/remote";
import { requestTVFocus } from "../../../shared/services/tv-focus";
import { colors, SAFE_INSET, text } from "../../../shared/theme";
import { PlaybackBar } from "../components/PlaybackBar";

const OVERLAY_DURATION_MS = 4000;
const SEEK_BACK_MS = -10_000;
const SEEK_FORWARD_MS = 30_000;

type Props = {
	programId: number;
	onExit: () => void;
};

export function RecordingPlayerScreen({ programId, onExit }: Props) {
	const recording = useRecording(programId);
	const channels = useChannels();
	const [preferences, updatePreferences] = usePreferences();
	const [paused, setPaused] = useState(false);
	const [progress, setProgress] = useState<Progress>({ positionMs: 0 });
	const [error, setError] = useState<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [overlayVisible, showOverlay] = useTransientVisibility(OVERLAY_DURATION_MS, programId);
	const playerRef = useRef<PlayerViewHandle>(null);
	const rootRef = useRef<HostInstance>(null);

	// Android はフォーカスのあるビューにしかキーを配らない。メニューのボタンが消えたら画面に戻す。
	useEffect(() => {
		if (!menuOpen) {
			requestTVFocus(rootRef.current);
		}
	}, [menuOpen]);

	const closeMenu = useCallback(() => {
		setMenuOpen(false);
	}, []);
	useBackHandler(menuOpen ? closeMenu : onExit);

	const seekBy = (offsetMs: number) => {
		void playerRef.current?.seekBy(offsetMs);
		showOverlay();
	};

	useTVEventHandler((event) => {
		if (menuOpen) {
			return;
		}
		const repeating = remoteKeyRepeating(event);
		if (repeating === "left" || repeating === "rewind") {
			seekBy(SEEK_BACK_MS);
			return;
		}
		if (repeating === "right" || repeating === "fastForward") {
			seekBy(SEEK_FORWARD_MS);
			return;
		}
		const key = remoteKeyUp(event);
		if (key === "playPause" || key === "play" || key === "pause") {
			setPaused(key === "playPause" ? !paused : key === "pause");
			showOverlay();
		} else if (key === "down" || key === "menu") {
			setMenuOpen(true);
		} else if (key === "up" || key === "info") {
			showOverlay();
		}
	});

	const program = recording.data?.program;
	const channel = channels.data?.find((c) => c.id === program?.serviceId);

	return (
		<Pressable
			ref={rootRef}
			hasTVPreferredFocus
			onPress={() => {
				setPaused(!paused);
				showOverlay();
			}}
			style={styles.container}
		>
			<PlayerView
				ref={playerRef}
				source={recordingPlaylistUrl(programId)}
				showCaption={preferences.captions}
				paused={paused}
				onProgress={(event) => {
					setProgress(event.nativeEvent);
				}}
				onPlaybackState={(event) => {
					if (event.nativeEvent.state === "ended") {
						setPaused(true);
					}
				}}
				onPlaybackError={(event) => {
					setError(event.nativeEvent.message);
				}}
				style={StyleSheet.absoluteFill}
			/>
			{error != null && <StatusMessage>録画を再生できませんでした（{error}）</StatusMessage>}
			{(paused || overlayVisible || menuOpen) && program != null && (
				<View style={styles.overlay}>
					<Text style={styles.meta}>
						{channel?.name}　{formatDate(program.startAt)}{" "}
						{formatRange(program.startAt, program.duration)}
					</Text>
					<Text style={styles.title} numberOfLines={1}>
						{program.name}
					</Text>
					<PlaybackBar
						positionMs={progress.positionMs}
						durationMs={progress.durationMs}
						paused={paused}
					/>
					{menuOpen && (
						<View style={styles.actions}>
							<Button
								label={preferences.captions ? "字幕：オン" : "字幕：オフ"}
								hasTVPreferredFocus
								onPress={() => {
									updatePreferences({ ...preferences, captions: !preferences.captions });
								}}
							/>
						</View>
					)}
				</View>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.video },
	overlay: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		gap: 6,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingTop: 24,
		paddingBottom: SAFE_INSET.vertical,
		backgroundColor: colors.scrim,
	},
	meta: { ...text.label, color: colors.fgMuted },
	title: { ...text.title, color: colors.fg },
	actions: { flexDirection: "row", gap: 12, marginTop: 8 },
});
