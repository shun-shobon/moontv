import type { Status } from "@moontv/core/api/schemas";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../../shared/components/Button";
import { colors, SAFE_INSET, text } from "../../../shared/theme";

type Props = {
	serverUrl: string;
	status: Status | undefined;
	onChangeServer: () => void;
};

export function ServerSettings({ serverUrl, status, onChangeServer }: Props) {
	return (
		<View style={styles.container}>
			<Text style={styles.heading}>サーバー</Text>
			<Text style={styles.value}>{serverUrl}</Text>
			{status != null && (
				<Text style={styles.detail}>
					moontv {status.version}・エンコーダー {status.encoder}
				</Text>
			)}
			<View style={styles.actions}>
				<Button label="接続先を変更" onPress={onChangeServer} />
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { gap: 8, paddingHorizontal: SAFE_INSET.horizontal },
	heading: { ...text.heading, color: colors.fgMuted },
	value: { ...text.subtitle, color: colors.fg },
	detail: { ...text.label, color: colors.fgSubtle },
	actions: { flexDirection: "row", marginTop: 8 },
});
