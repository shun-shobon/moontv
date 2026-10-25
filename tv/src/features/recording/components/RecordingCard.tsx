import type { Channel, Program } from "@moontv/core/api/schemas";
import { formatDuration } from "@moontv/core/domain/duration";
import { formatDate, formatRange, formatTime } from "@moontv/core/domain/time";
import type { Ref } from "react";
import type { HostInstance } from "react-native";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, text } from "../../../shared/theme";

type Props = {
	ref?: Ref<HostInstance>;
	program: Program;
	channel: Channel | undefined;
	/** 録画の長さ。録画していなければ null。 */
	durationMs: number | null;
	/** 「変換中」「録画中」など、見たり操作したりする前に知っておきたい状態。 */
	status: string | null;
	hasTVPreferredFocus: boolean;
	onPress: () => void;
};

export function RecordingCard({
	ref,
	program,
	channel,
	durationMs,
	status,
	hasTVPreferredFocus,
	onPress,
}: Props) {
	return (
		<Pressable
			ref={ref}
			onPress={onPress}
			hasTVPreferredFocus={hasTVPreferredFocus}
			style={({ focused }) => [styles.card, focused && styles.focused]}
		>
			<Text style={styles.channel} numberOfLines={1}>
				{channel?.name ?? "不明なチャンネル"}
			</Text>
			<Text style={styles.name} numberOfLines={2}>
				{program.name}
			</Text>
			<Text style={styles.time} numberOfLines={1}>
				{formatDate(program.startAt)}{" "}
				{/* 録画は長さを出すので、幅の足りないカードでは終了時刻を省く。 */}
				{durationMs == null
					? formatRange(program.startAt, program.duration)
					: `${formatTime(program.startAt)}　${formatDuration(durationMs)}`}
			</Text>
			{status != null && <Text style={styles.status}>{status}</Text>}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		width: 204,
		height: 132,
		gap: 4,
		padding: 12,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: colors.line,
		backgroundColor: colors.surface,
	},
	focused: { borderColor: colors.fgAccent, backgroundColor: colors.selected },
	channel: { ...text.caption, color: colors.fgMuted },
	name: { ...text.heading, color: colors.fg },
	time: { ...text.caption, color: colors.fgSubtle },
	status: { ...text.caption, color: colors.fgAccent },
});
