import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, SAFE_INSET } from "../theme";

type Props = {
	children: ReactNode;
	/** パネルの下端に並べるボタン。 */
	actions: ReactNode;
};

/** 一覧や番組表の上に、右から重ねて詳しい情報と操作を出す。 */
export function SidePanel({ children, actions }: Props) {
	return (
		<View style={styles.scrim}>
			<View style={styles.panel}>
				<View style={styles.body}>{children}</View>
				<View style={styles.actions}>{actions}</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim, alignItems: "flex-end" },
	panel: {
		width: 560,
		height: "100%",
		gap: 12,
		paddingHorizontal: 32,
		paddingVertical: SAFE_INSET.vertical,
		backgroundColor: colors.surface,
	},
	body: { flex: 1, gap: 8, overflow: "hidden" },
	actions: { flexDirection: "row", gap: 12 },
});
