import type { Channel } from "@moontv/core/api/schemas";
import { logoUrl } from "@moontv/core/api/urls";
import { formatRange } from "@moontv/core/domain/time";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";

type Props = {
	channel: Channel;
	onPress: () => void;
	hasTVPreferredFocus: boolean;
};

export function ChannelCard({ channel, onPress, hasTVPreferredFocus }: Props) {
	const { present } = channel;
	return (
		<Pressable
			onPress={onPress}
			hasTVPreferredFocus={hasTVPreferredFocus}
			style={({ focused }) => [styles.card, focused && styles.focused]}
		>
			<View style={styles.header}>
				{channel.hasLogo && (
					<Image source={{ uri: logoUrl(channel.id) }} style={styles.logo} resizeMode="contain" />
				)}
				<Text style={styles.name} numberOfLines={1}>
					{channel.name}
				</Text>
			</View>
			<Text style={styles.program} numberOfLines={2}>
				{present?.name ?? "番組情報なし"}
			</Text>
			{present != null && (
				<Text style={styles.time}>{formatRange(present.startAt, present.duration)}</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 204,
		height: 124,
		gap: 6,
		padding: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: colors.line,
		backgroundColor: colors.surface,
	},
	focused: { borderColor: colors.fgAccent, backgroundColor: colors.selected },
	header: { flexDirection: "row", alignItems: "center", gap: 8 },
	logo: { width: 32, height: 18 },
	name: { ...text.label, flex: 1, color: colors.fgMuted },
	program: { ...text.heading, color: colors.fg },
	time: { ...text.caption, color: colors.fgSubtle },
});
