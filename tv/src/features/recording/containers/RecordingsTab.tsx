import { useChannels, useRecordings, useSchedules, useStatus } from "@moontv/core/api/queries";
import type { Program, Recording, Schedule } from "@moontv/core/api/schemas";
import { SCHEDULE_LABELS } from "@moontv/core/domain/schedule";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import type { HostInstance } from "react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { StatusMessage } from "../../../shared/components/StatusMessage";
import { useNow } from "../../../shared/hooks/useNow";
import { requestTVFocus } from "../../../shared/services/tv-focus";
import { colors, SAFE_INSET, text } from "../../../shared/theme";
import { ProgramDetailPanel } from "../../guide/containers/ProgramDetailPanel";
import { RecordingCard } from "../components/RecordingCard";
import { RecordingDetailPanel } from "./RecordingDetailPanel";

type Props = {
	/** 再生から戻ったときに、見ていた録画へフォーカスを戻す。 */
	focusId: number | null;
	onPlay: (programId: number) => void;
	onWatch: (serviceId: number) => void;
	/** 選んでいたカードが消えたときに、タブの列へフォーカスを移す。 */
	onFocusLost: () => void;
};

type Selection =
	| { kind: "schedule"; program: Program }
	| { kind: "recording"; recording: Recording };

const SCHEDULE_STATUS: Record<Schedule["state"], string | null> = {
	scheduled: null,
	recording: SCHEDULE_LABELS.recording,
	finished: SCHEDULE_LABELS.finished,
	failed: SCHEDULE_LABELS.failed,
};

const RECORDING_STATUS: Record<Recording["state"], string | null> = {
	recording: "録画中",
	converting: "変換中",
	ready: null,
	failed: "変換に失敗",
};

export function RecordingsTab({ focusId, onPlay, onWatch, onFocusLost }: Props) {
	const now = useNow();
	const status = useStatus();
	const channels = useChannels();
	const recordingEnabled = status.data?.recording ?? false;
	const library = status.data?.library ?? false;
	const schedules = useSchedules(recordingEnabled);
	const recordings = useRecordings(library);
	const [selection, setSelection] = useState<Selection | null>(null);
	const cards = useRef(new Map<number, HostInstance>());
	const channelById = useMemo(() => new Map(channels.data?.map((c) => [c.id, c])), [channels.data]);

	if (status.isError || schedules.isError || recordings.isError) {
		return <StatusMessage>録画の情報を取得できませんでした</StatusMessage>;
	}
	if (status.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}
	if (!recordingEnabled) {
		return (
			<StatusMessage>
				mirakc の録画が無効です。mirakc の設定で recording.basedir を指定してください。
			</StatusMessage>
		);
	}
	if (schedules.data == null || (library && recordings.data == null)) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}

	// 録画中のものは止める操作がある予約の側に出し、終わった予約は録画の側に出す。
	const listedSchedules = library
		? schedules.data.filter((s) => s.state !== "finished")
		: schedules.data;
	const listedRecordings = (recordings.data ?? []).filter((r) => r.state !== "recording");
	const preferredId = focusId ?? listedSchedules[0]?.program.id ?? listedRecordings[0]?.program.id;

	const cardRef = (id: number) => (element: HostInstance | null) => {
		if (element == null) {
			cards.current.delete(id);
		} else {
			cards.current.set(id, element);
		}
	};
	const close = (id: number) => {
		setSelection(null);
		const card = cards.current.get(id);
		if (card == null) {
			onFocusLost();
		} else {
			requestTVFocus(card);
		}
	};

	const section = (title: string, empty: string, children: ReactNode[]) => (
		<View style={styles.section}>
			<Text style={styles.heading}>{title}</Text>
			{children.length === 0 ? (
				<Text style={styles.empty}>{empty}</Text>
			) : (
				<View style={styles.grid}>{children}</View>
			)}
		</View>
	);

	return (
		<View style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				{section(
					"録画予約",
					"録画予約はありません。番組表で番組を選ぶと予約できます",
					listedSchedules.map(({ program, state }) => (
						<RecordingCard
							key={program.id}
							ref={cardRef(program.id)}
							program={program}
							channel={channelById.get(program.serviceId)}
							durationMs={null}
							status={SCHEDULE_STATUS[state]}
							hasTVPreferredFocus={program.id === preferredId}
							onPress={() => {
								setSelection({ kind: "schedule", program });
							}}
						/>
					)),
				)}
				{library &&
					section(
						"録画",
						"録画はまだありません。録画が終わると変換してここに並びます",
						listedRecordings.map((recording) => (
							<RecordingCard
								key={recording.program.id}
								ref={cardRef(recording.program.id)}
								program={recording.program}
								channel={channelById.get(recording.program.serviceId)}
								durationMs={recording.durationMs}
								status={RECORDING_STATUS[recording.state]}
								hasTVPreferredFocus={recording.program.id === preferredId}
								onPress={() => {
									setSelection({ kind: "recording", recording });
								}}
							/>
						)),
					)}
			</ScrollView>
			{selection?.kind === "schedule" && (
				<ProgramDetailPanel
					program={selection.program}
					channel={channelById.get(selection.program.serviceId)}
					now={now}
					onWatch={() => {
						onWatch(selection.program.serviceId);
					}}
					onClose={() => {
						close(selection.program.id);
					}}
				/>
			)}
			{selection?.kind === "recording" && (
				<RecordingDetailPanel
					recording={selection.recording}
					channel={channelById.get(selection.recording.program.serviceId)}
					onPlay={() => {
						onPlay(selection.recording.program.id);
					}}
					onClose={() => {
						close(selection.recording.program.id);
					}}
					onDeleted={() => {
						setSelection(null);
						onFocusLost();
					}}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: {
		gap: 24,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingBottom: SAFE_INSET.vertical,
	},
	section: { gap: 12 },
	heading: { ...text.heading, color: colors.fgMuted },
	empty: { ...text.body, color: colors.fgSubtle },
	grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
});
