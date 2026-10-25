import type { RefObject } from "react";
import type { HostInstance } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, SAFE_INSET, text } from "../../shared/theme";

export type Tab = "live" | "guide" | "settings";

const TABS: { id: Tab; label: string }[] = [
	{ id: "live", label: "ライブ" },
	{ id: "guide", label: "番組表" },
	{ id: "settings", label: "設定" },
];

type Props = {
	selected: Tab;
	onSelect: (tab: Tab) => void;
	/** 内容からタブの列へフォーカスを戻すときの行き先。 */
	selectedRef: RefObject<HostInstance | null>;
};

export function TabBar({ selected, onSelect, selectedRef }: Props) {
	return (
		<View style={styles.bar}>
			<Text style={styles.brand}>moontv</Text>
			{TABS.map((tab) => (
				<Pressable
					key={tab.id}
					ref={tab.id === selected ? selectedRef : undefined}
					onPress={() => {
						onSelect(tab.id);
					}}
					style={({ focused }) => [styles.tab, focused && styles.focused]}
				>
					{({ focused }) => (
						<Text
							style={[
								styles.label,
								tab.id === selected && styles.selectedLabel,
								focused && styles.focusedLabel,
							]}
						>
							{tab.label}
						</Text>
					)}
				</Pressable>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	bar: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingTop: SAFE_INSET.vertical,
		paddingBottom: 16,
	},
	brand: { ...text.subtitle, color: colors.fgAccent, marginRight: 24 },
	tab: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
	focused: { backgroundColor: colors.fg },
	label: { ...text.heading, color: colors.fgSubtle },
	selectedLabel: { color: colors.fg },
	focusedLabel: { color: colors.canvas },
});
