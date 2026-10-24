import type { Channel } from "@moontv/core/api/schemas";
import { channelTypeLabel } from "@moontv/core/domain/channel-type";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { formatRange } from "@moontv/core/domain/time";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, SAFE_INSET, text } from "../../../shared/theme";

type Props = {
	channel: Channel;
	/** 番組情報の下に並べる操作。 */
	actions?: ReactNode;
};

export function ChannelBanner({ channel, actions }: Props) {
	const { present, following } = channel;
	return (
		<View style={styles.banner}>
			<Text style={styles.channel}>
				{channelTypeLabel(channel.channelType)}　{channel.name}
			</Text>
			<Text style={styles.program} numberOfLines={1}>
				{present?.name ?? "番組情報なし"}
			</Text>
			{present != null && (
				<Text style={styles.meta}>
					{formatRange(present.startAt, present.duration)}
					{present.marks.length > 0 && `　${formatMarks(present.marks)}`}
				</Text>
			)}
			{following != null && (
				<Text style={styles.next} numberOfLines={1}>
					次　{formatRange(following.startAt, following.duration)}　{following.name}
				</Text>
			)}
			{actions != null && <View style={styles.actions}>{actions}</View>}
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,
		gap: 4,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingTop: 24,
		paddingBottom: SAFE_INSET.vertical,
		backgroundColor: colors.scrim,
	},
	channel: { ...text.label, color: colors.fgMuted },
	program: { ...text.title, color: colors.fg },
	meta: { ...text.label, color: colors.fgSecondary },
	next: { ...text.label, color: colors.fgSubtle },
	actions: { flexDirection: "row", gap: 12, marginTop: 12 },
});
