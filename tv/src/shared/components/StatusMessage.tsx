import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, text } from "../theme";

export function StatusMessage({ children, action }: { children: ReactNode; action?: ReactNode }) {
	return (
		<View style={styles.container}>
			<Text style={styles.message}>{children}</Text>
			{action}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20, padding: 48 },
	message: { ...text.subtitle, color: colors.fgSecondary, textAlign: "center" },
});
