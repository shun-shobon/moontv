import type { Codec } from "@moontv/core/api/schemas";
import { codecLabel } from "@moontv/core/services/player-settings";
import { StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";

export function DeviceSupport({
	support,
}: {
	support: readonly { codec: Codec; playable: boolean }[];
}) {
	return (
		<View style={styles.list}>
			{support.map(({ codec, playable }) => (
				<Text key={codec} style={styles.row}>
					{codecLabel(codec)}　
					<Text style={playable ? styles.ok : styles.ng}>
						{playable ? "再生できる" : "再生できない"}
					</Text>
				</Text>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	list: { gap: 4, padding: 12, borderRadius: 8, backgroundColor: colors.surface },
	row: { ...text.label, color: colors.fg },
	ok: { color: colors.fgSecondary },
	ng: { color: colors.fgSubtle },
});
