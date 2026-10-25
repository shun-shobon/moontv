import type {
	Channel,
	Program,
	ProgramDetail as Detail,
	ScheduleState,
} from "@moontv/core/api/schemas";
import { GENRE_LABELS, genreOf } from "@moontv/core/domain/genre";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { SCHEDULE_LABELS } from "@moontv/core/domain/schedule";
import { formatDate, formatRange, isOnAir } from "@moontv/core/domain/time";
import { reservationAction } from "@moontv/core/services/reservation";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "../../../shared/components/Button";
import { SidePanel } from "../../../shared/components/SidePanel";
import { colors, text } from "../../../shared/theme";

export type Reservation = {
	state: ScheduleState | null;
	isPending: boolean;
	failed: boolean;
	onChange: (scheduled: boolean) => void;
};

type Props = {
	program: Program;
	channel: Channel | undefined;
	extended: Detail["extended"] | undefined;
	/** mirakc で録画が無効なら null。 */
	reservation: Reservation | null;
	now: number;
	onWatch: () => void;
	onClose: () => void;
};

export function ProgramDetail({
	program,
	channel,
	extended,
	reservation,
	now,
	onWatch,
	onClose,
}: Props) {
	const onAir = isOnAir(program.startAt, program.duration, now);
	const ended = !onAir && program.startAt <= now;
	const scheduleState = reservation?.state ?? null;
	const action = reservationAction(scheduleState, ended);
	const meta = [
		GENRE_LABELS[genreOf(program.genres)],
		program.marks.length > 0 ? formatMarks(program.marks) : null,
	].filter((item) => item != null);

	return (
		<SidePanel
			actions={
				<>
					{onAir && <Button label="視聴する" onPress={onWatch} hasTVPreferredFocus />}
					{reservation != null && action != null && (
						<Button
							label={reservation.isPending ? "変更中…" : action.label}
							hasTVPreferredFocus={!onAir}
							// 無効にするとフォーカスが外れ、リモコンのキーが届かなくなるので、押しても何もしないだけにする。
							onPress={() => {
								if (!reservation.isPending) {
									reservation.onChange(action.scheduled);
								}
							}}
						/>
					)}
					<Button
						label="閉じる"
						onPress={onClose}
						hasTVPreferredFocus={!onAir && (reservation == null || action == null)}
					/>
				</>
			}
		>
			<Text style={styles.channel}>
				{channel?.name}　{formatDate(program.startAt)}{" "}
				{formatRange(program.startAt, program.duration)}
			</Text>
			<Text style={styles.title} numberOfLines={3}>
				{program.name}
			</Text>
			<Text style={styles.meta}>
				{meta.join("　")}
				{scheduleState != null && (
					<Text style={styles.schedule}>　{SCHEDULE_LABELS[scheduleState]}</Text>
				)}
			</Text>
			<View style={styles.body}>
				<Text style={styles.description} numberOfLines={6}>
					{program.description}
				</Text>
				{extended?.slice(0, 3).map((item) => (
					<View key={item.key} style={styles.extended}>
						<Text style={styles.extendedKey}>{item.key}</Text>
						<Text style={styles.extendedValue} numberOfLines={3}>
							{item.value}
						</Text>
					</View>
				))}
			</View>
			{(reservation?.failed ?? false) && (
				<Text style={styles.error}>録画予約を変更できませんでした</Text>
			)}
		</SidePanel>
	);
}

const styles = StyleSheet.create({
	channel: { ...text.label, color: colors.fgMuted },
	title: { ...text.title, color: colors.fg },
	meta: { ...text.caption, color: colors.fgSubtle },
	schedule: { color: colors.fgAccent },
	body: { flex: 1, gap: 12, marginTop: 8 },
	description: { ...text.body, color: colors.fgSecondary },
	extended: { gap: 2, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.lineStrong },
	extendedKey: { ...text.heading, color: colors.fg },
	extendedValue: { ...text.label, color: colors.fgMuted },
	error: { ...text.caption, color: colors.fgAccent },
});
