import { StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";
import { formatPlaybackTime } from "../services/playback-time";

type Props = {
	positionMs: number;
	durationMs: number | undefined;
	paused: boolean;
};

export function PlaybackBar({ positionMs, durationMs, paused }: Props) {
	const ratio = durationMs == null || durationMs === 0 ? 0 : Math.min(1, positionMs / durationMs);
	return (
		<View style={styles.container}>
			<View style={styles.track}>
				<View style={[styles.fill, { width: `${ratio * 100}%` }]} />
			</View>
			<Text style={styles.time}>
				{paused ? "一時停止　" : ""}
				{formatPlaybackTime(positionMs)}
				{durationMs != null && ` / ${formatPlaybackTime(durationMs)}`}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: 6 },
	track: { height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, overflow: "hidden" },
	fill: { height: 4, backgroundColor: colors.fgAccent },
	time: { ...text.label, color: colors.fgSecondary },
});
