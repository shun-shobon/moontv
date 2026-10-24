import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, SAFE_INSET, text } from "../../shared/theme";

export type Tab = "live" | "settings";

const TABS: { id: Tab; label: string }[] = [
	{ id: "live", label: "ライブ" },
	{ id: "settings", label: "設定" },
];

type Props = {
	selected: Tab;
	onSelect: (tab: Tab) => void;
};

export function TabBar({ selected, onSelect }: Props) {
	return (
		<View style={styles.bar}>
			<Text style={styles.brand}>moontv</Text>
			{TABS.map((tab) => (
				<Pressable
					key={tab.id}
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
