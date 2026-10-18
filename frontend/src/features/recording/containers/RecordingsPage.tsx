import { useMemo, useState } from "react";

import {
	useChannels,
	useScheduleMutation,
	useSchedules,
	useStatus,
} from "../../../shared/api/queries";
import type { ScheduleState } from "../../../shared/api/schemas";
import { Button } from "../../../shared/components/Button";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { SCHEDULE_LABELS } from "../../../shared/domain/schedule";
import { recordingPath } from "../../../shared/services/routes";
import { useDeleteRecording, useRecordings } from "../api/queries";
import type { RecordingState } from "../api/schemas";
import { DeleteRecordingButton } from "../components/DeleteRecordingButton";
import type { CardStatus } from "../components/ProgramCard";
import { ProgramCard } from "../components/ProgramCard";

type Tab = "recordings" | "schedules";
const TABS: readonly Tab[] = ["recordings", "schedules"];
const TAB_LABELS: Record<Tab, string> = { recordings: "録画", schedules: "予約" };

const recordingStatus = (state: RecordingState): CardStatus | null => {
	if (state === "converting") {
		return { label: "変換中", tone: "accent" };
	}
	return state === "failed" ? { label: "変換に失敗しました", tone: "muted" } : null;
};

const scheduleStatus = (state: ScheduleState, changeFailed: boolean): CardStatus | null => {
	if (changeFailed) {
		return { label: "予約を変更できませんでした", tone: "muted" };
	}
	if (state === "recording") {
		return { label: SCHEDULE_LABELS.recording, tone: "accent" };
	}
	return state === "failed" ? { label: SCHEDULE_LABELS.failed, tone: "muted" } : null;
};

export function RecordingsPage() {
	const status = useStatus();
	const channels = useChannels();
	const recording = status.data?.recording ?? false;
	const library = status.data?.library ?? false;
	const schedules = useSchedules(recording);
	const recordings = useRecordings(library);
	const scheduleMutation = useScheduleMutation();
	const deletion = useDeleteRecording();
	const [tab, setTab] = useState<Tab>("recordings");
	const channelById = useMemo(() => new Map(channels.data?.map((c) => [c.id, c])), [channels.data]);

	if (status.isError || schedules.isError || recordings.isError) {
		return <StatusMessage>録画の情報を取得できませんでした。</StatusMessage>;
	}
	if (status.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}
	if (!recording) {
		return (
			<StatusMessage>
				mirakc の録画が無効です。mirakc の設定で recording.basedir を指定してください。
			</StatusMessage>
		);
	}
	if (schedules.data == null || (library && recordings.data == null)) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}

	// 録画一覧がなければ、録画は mirakc に任せたままなので予約だけを出す。
	const shown: Tab = library ? tab : "schedules";
	const scheduleTarget = scheduleMutation.variables?.programId ?? null;
	// 録画中のものは止める操作がある予約の側に出し、終わった予約は録画の側に出す。
	const listedRecordings = (recordings.data ?? []).filter((r) => r.state !== "recording");
	const listedSchedules = library
		? schedules.data.filter((s) => s.state !== "finished")
		: schedules.data;

	const recordingCards =
		listedRecordings.length === 0 ? (
			<StatusMessage>録画はまだありません。録画が終わると変換してここに並びます。</StatusMessage>
		) : (
			<ul className="flex flex-col gap-2">
				{listedRecordings.map(({ program, state, durationMs }) => (
					<li key={program.id}>
						<ProgramCard
							program={program}
							channel={channelById.get(program.serviceId)}
							durationMs={durationMs}
							status={recordingStatus(state)}
							href={state === "ready" ? recordingPath(program.id) : null}
							active={false}
							// 変換中のものは書き込みの途中なので消させない。
							action={
								state === "converting" ? null : (
									<DeleteRecordingButton
										isPending={deletion.isPending && deletion.variables === program.id}
										failed={deletion.isError && deletion.variables === program.id}
										onDelete={() => {
											deletion.mutate(program.id);
										}}
									/>
								)
							}
						/>
					</li>
				))}
			</ul>
		);

	const scheduleCards =
		listedSchedules.length === 0 ? (
			<StatusMessage>録画予約はありません。番組表で番組を選ぶと予約できます。</StatusMessage>
		) : (
			<ul className="flex flex-col gap-2">
				{listedSchedules.map(({ program, state }) => {
					const targeted = scheduleTarget === program.id;
					return (
						<li key={program.id}>
							<ProgramCard
								program={program}
								channel={channelById.get(program.serviceId)}
								durationMs={null}
								status={scheduleStatus(state, targeted && scheduleMutation.isError)}
								href={null}
								active={false}
								action={
									state === "scheduled" || state === "recording" ? (
										<Button
											variant="quiet"
											isPending={targeted && scheduleMutation.isPending}
											onPress={() => {
												scheduleMutation.mutate({ programId: program.id, scheduled: false });
											}}
										>
											{state === "scheduled" ? "取り消す" : "録画を止める"}
										</Button>
									) : null
								}
							/>
						</li>
					);
				})}
			</ul>
		);

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4">
			{library && (
				<SegmentedControl
					label="録画の表示"
					options={TABS}
					value={shown}
					format={(t) => TAB_LABELS[t]}
					onChange={setTab}
					className="flex gap-1"
				/>
			)}
			{shown === "recordings" ? recordingCards : scheduleCards}
		</div>
	);
}
