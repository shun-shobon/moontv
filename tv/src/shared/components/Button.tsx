import { Pressable, StyleSheet, Text } from "react-native";

import { colors, text } from "../theme";

type Props = {
	label: string;
	onPress: () => void;
	hasTVPreferredFocus?: boolean;
	disabled?: boolean;
};

export function Button({ label, onPress, hasTVPreferredFocus, disabled = false }: Props) {
	return (
		<Pressable
			onPress={onPress}
			hasTVPreferredFocus={hasTVPreferredFocus}
			disabled={disabled}
			style={({ focused }) => [
				styles.button,
				focused && styles.focused,
				disabled && styles.disabled,
			]}
		>
			{({ focused }) => <Text style={[styles.label, focused && styles.focusedLabel]}>{label}</Text>}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		borderRadius: 8,
		paddingHorizontal: 20,
		paddingVertical: 10,
		backgroundColor: colors.surface,
		borderWidth: 2,
		borderColor: colors.lineStrong,
	},
	focused: { backgroundColor: colors.accent, borderColor: colors.accent },
	disabled: { opacity: 0.5 },
	label: { ...text.heading, color: colors.fgSecondary },
	focusedLabel: { color: colors.onAccent },
});
