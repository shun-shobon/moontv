import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "../../../shared/components/Button";
import { colors, SAFE_INSET, text } from "../../../shared/theme";

type Props = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	busy: boolean;
	error: string | null;
};

export function ServerForm({ value, onChange, onSubmit, busy, error }: Props) {
	const [focused, setFocused] = useState(false);
	return (
		<View style={styles.container}>
			<Text style={styles.title}>moontv サーバーに接続</Text>
			<Text style={styles.description}>
				moontv が動いているマシンのアドレスを入力してください。ポートを省くと 40780 を使います。
			</Text>
			<TextInput
				value={value}
				onChangeText={onChange}
				onSubmitEditing={onSubmit}
				placeholder="192.168.0.10"
				placeholderTextColor={colors.fgSubtle}
				autoCapitalize="none"
				autoCorrect={false}
				keyboardType="url"
				returnKeyType="go"
				// TextInput には hasTVPreferredFocus が効かない。最初に打つのはアドレスなので、キーボードごと開く。
				// oxlint-disable-next-line jsx-a11y/no-autofocus
				autoFocus
				onFocus={() => {
					setFocused(true);
				}}
				onBlur={() => {
					setFocused(false);
				}}
				style={[styles.input, focused && styles.focusedInput]}
			/>
			{error != null && <Text style={styles.error}>{error}</Text>}
			<View style={styles.actions}>
				<Button label={busy ? "接続中…" : "接続"} onPress={onSubmit} disabled={busy} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: "center",
		gap: 16,
		paddingHorizontal: SAFE_INSET.horizontal * 3,
	},
	title: { ...text.title, color: colors.fg },
	description: { ...text.body, color: colors.fgMuted },
	input: {
		...text.subtitle,
		color: colors.fg,
		backgroundColor: colors.surface,
		borderWidth: 2,
		borderColor: colors.lineStrong,
		borderRadius: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	focusedInput: { borderColor: colors.fgAccent },
	error: { ...text.body, color: colors.fgAccent },
	actions: { flexDirection: "row" },
});
