import type { Channel, Program, ScheduleState } from "@moontv/core/api/schemas";
import { logoUrl } from "@moontv/core/api/urls";
import { HOUR_MS, formatDate } from "@moontv/core/domain/time";
import { programEnd } from "@moontv/core/services/guide";
import type { LayoutChangeEvent } from "react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";
import { COLUMN_WIDTH, HEADER_HEIGHT, TIME_COLUMN_WIDTH, toDp } from "../services/guide-layout";
import { ProgramCell } from "./ProgramCell";

type Props = {
	columns: readonly Channel[];
	programsByService: ReadonlyMap<number, readonly Program[]>;
	scheduleStates: ReadonlyMap<number, ScheduleState>;
	firstColumn: number;
	visibleColumns: number;
	viewStart: number;
	visibleMs: number;
	selectedColumn: number;
	selectedProgramId: number | null;
	/** 番組表にフォーカスが無いときは、選んでいる番組を目立たせない。 */
	focused: boolean;
	now: number;
	onBodyLayout: (event: LayoutChangeEvent) => void;
};

export function GuideGrid({
	columns,
	programsByService,
	scheduleStates,
	firstColumn,
	visibleColumns,
	viewStart,
	visibleMs,
	selectedColumn,
	selectedProgramId,
	focused,
	now,
	onBodyLayout,
}: Props) {
	const viewEnd = viewStart + visibleMs;
	// 端の列が半分だけ見えるよう、1列多く描く。
	const shown = columns.slice(firstColumn, firstColumn + visibleColumns + 1);
	const firstHour = Math.ceil(viewStart / HOUR_MS) * HOUR_MS;
	const hours = Array.from(
		{ length: Math.ceil(visibleMs / HOUR_MS) + 1 },
		(_, i) => firstHour + i * HOUR_MS,
	).filter((h) => h < viewEnd);
	const nowTop = viewStart <= now && now < viewEnd ? toDp(now - viewStart) : null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.date}>{formatDate(viewStart)}</Text>
				{shown.map((channel, i) => (
					<View
						key={channel.id}
						style={[styles.channel, firstColumn + i === selectedColumn && styles.selectedChannel]}
					>
						{channel.hasLogo && (
							<Image
								source={{ uri: logoUrl(channel.id) }}
								style={styles.logo}
								resizeMode="contain"
							/>
						)}
						<Text style={styles.channelName} numberOfLines={1}>
							{channel.name}
						</Text>
					</View>
				))}
			</View>
			<View style={styles.body} onLayout={onBodyLayout}>
				<View style={styles.timeColumn}>
					{hours.map((hour) => (
						<Text key={hour} style={[styles.hour, { top: toDp(hour - viewStart) }]}>
							{new Date(hour).getHours()}
						</Text>
					))}
				</View>
				{shown.map((channel) => (
					<View key={channel.id} style={styles.column}>
						{(programsByService.get(channel.id) ?? [])
							.filter((p) => p.startAt < viewEnd && programEnd(p) > viewStart)
							.map((program) => {
								const top = toDp(program.startAt - viewStart);
								return (
									<ProgramCell
										key={program.id}
										program={program}
										top={top}
										height={toDp(programEnd(program) - program.startAt)}
										hiddenTop={Math.max(0, -top)}
										selected={focused && program.id === selectedProgramId}
										scheduleState={scheduleStates.get(program.id) ?? null}
									/>
								);
							})}
					</View>
				))}
				{nowTop != null && <View style={[styles.nowLine, { top: nowTop }]} />}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: { flexDirection: "row", height: HEADER_HEIGHT, alignItems: "center" },
	date: { ...text.caption, width: TIME_COLUMN_WIDTH, color: colors.fgMuted },
	channel: {
		width: COLUMN_WIDTH,
		height: HEADER_HEIGHT,
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		paddingHorizontal: 6,
		borderBottomWidth: 2,
		borderBottomColor: colors.line,
	},
	selectedChannel: { borderBottomColor: colors.fgAccent },
	logo: { width: 32, height: 18 },
	channelName: { ...text.label, flex: 1, color: colors.fgSecondary },
	body: { flex: 1, flexDirection: "row", overflow: "hidden" },
	timeColumn: { width: TIME_COLUMN_WIDTH },
	hour: { ...text.caption, position: "absolute", left: 0, color: colors.fgSubtle },
	column: { width: COLUMN_WIDTH, borderLeftWidth: 1, borderLeftColor: colors.line },
	nowLine: {
		position: "absolute",
		left: TIME_COLUMN_WIDTH,
		right: 0,
		height: 2,
		backgroundColor: colors.accent,
	},
});
