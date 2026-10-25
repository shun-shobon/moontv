import type { Program, ScheduleState } from "@moontv/core/api/schemas";
import { genreOf } from "@moontv/core/domain/genre";
import { SCHEDULE_SHORT_LABELS } from "@moontv/core/domain/schedule";
import { formatTime } from "@moontv/core/domain/time";
import { StyleSheet, Text, View } from "react-native";

import { colors, genreColors, text } from "../../../shared/theme";
import { showsDescription } from "../services/guide-layout";

type Props = {
	program: Program;
	top: number;
	height: number;
	/** 表示の上端より前に始まった番組でも、題名を見える位置に出す。 */
	hiddenTop: number;
	selected: boolean;
	scheduleState: ScheduleState | null;
};

export function ProgramCell({ program, top, height, hiddenTop, selected, scheduleState }: Props) {
	const genreColor = genreColors[genreOf(program.genres)];
	return (
		<View
			style={[
				styles.cell,
				{ top, height, backgroundColor: `${genreColor}1a`, borderLeftColor: `${genreColor}99` },
				selected && styles.selected,
			]}
		>
			<View style={[styles.content, { paddingTop: 4 + hiddenTop }]}>
				<Text style={styles.time}>
					{formatTime(program.startAt)}
					{scheduleState != null && (
						<Text style={styles.schedule}>　{SCHEDULE_SHORT_LABELS[scheduleState]}</Text>
					)}
				</Text>
				<Text
					style={styles.name}
					numberOfLines={Math.max(1, Math.floor((height - hiddenTop - 24) / 18))}
				>
					{program.name}
				</Text>
				{showsDescription(height - hiddenTop) && (
					<Text style={styles.description} numberOfLines={3}>
						{program.description}
					</Text>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	cell: {
		position: "absolute",
		left: 0,
		right: 0,
		overflow: "hidden",
		borderLeftWidth: 3,
		borderBottomWidth: 1,
		borderBottomColor: colors.canvas,
	},
	selected: {
		borderWidth: 2,
		borderLeftWidth: 3,
		borderColor: colors.fgAccent,
		borderLeftColor: colors.fgAccent,
	},
	content: { gap: 2, paddingHorizontal: 6 },
	time: { ...text.caption, color: colors.fgMuted },
	schedule: { color: colors.fgAccent },
	name: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.fg },
	description: { ...text.caption, color: colors.fgSubtle },
});
