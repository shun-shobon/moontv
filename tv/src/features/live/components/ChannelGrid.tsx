import type { Channel } from "@moontv/core/api/schemas";
import { channelTypeLabel } from "@moontv/core/domain/channel-type";
import { channelTypes } from "@moontv/core/services/channel-list";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, SAFE_INSET, text } from "../../../shared/theme";
import { ChannelCard } from "./ChannelCard";

type Props = {
	channels: readonly Channel[];
	/** 視聴から戻ったときに、見ていたチャンネルへフォーカスを戻す。 */
	focusId: number | null;
	onSelect: (channel: Channel) => void;
};

export function ChannelGrid({ channels, focusId, onSelect }: Props) {
	const preferredId = focusId ?? channels[0]?.id;
	return (
		<ScrollView contentContainerStyle={styles.content}>
			{channelTypes(channels).map((type) => (
				<View key={type} style={styles.section}>
					<Text style={styles.heading}>{channelTypeLabel(type)}</Text>
					<View style={styles.grid}>
						{channels
							.filter((c) => c.channelType === type)
							.map((channel) => (
								<ChannelCard
									key={channel.id}
									channel={channel}
									hasTVPreferredFocus={channel.id === preferredId}
									onPress={() => {
										onSelect(channel);
									}}
								/>
							))}
					</View>
				</View>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: 24,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingBottom: SAFE_INSET.vertical,
	},
	section: { gap: 12 },
	heading: { ...text.heading, color: colors.fgMuted },
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
});
