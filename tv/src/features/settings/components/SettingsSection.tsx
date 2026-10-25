import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View style={styles.section}>
			<Text style={styles.title}>{title}</Text>
			{children}
		</View>
	);
}

const styles = StyleSheet.create({
	section: { gap: 8 },
	title: { ...text.heading, color: colors.fgMuted },
});
