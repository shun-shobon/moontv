import { Pressable, StyleSheet, Text } from "react-native";

import { colors, text } from "../../../shared/theme";

type Props = {
	label: string;
	value: string;
	/** 押すたびに次の値へ切り替える。 */
	onPress: () => void;
	hasTVPreferredFocus?: boolean;
};

export function SettingRow({ label, value, onPress, hasTVPreferredFocus }: Props) {
	return (
		<Pressable
			onPress={onPress}
			hasTVPreferredFocus={hasTVPreferredFocus}
			style={({ focused }) => [styles.row, focused && styles.focused]}
		>
			<Text style={styles.label}>{label}</Text>
			<Text style={styles.value}>{value}</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: colors.line,
		backgroundColor: colors.surface,
	},
	focused: { borderColor: colors.fgAccent, backgroundColor: colors.selected },
	label: { ...text.body, color: colors.fg },
	value: { ...text.body, color: colors.fgAccent },
});
