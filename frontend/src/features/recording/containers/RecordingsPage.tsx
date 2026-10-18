import { useMemo, useState } from "react";

import {
	useChannels,
	useScheduleMutation,
	useSchedules,
	useStatus,
} from "../../../shared/api/queries";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { useDeleteRecording, useRecordings } from "../api/queries";
import { RecordingList } from "../components/RecordingList";
import { ScheduleList } from "../components/ScheduleList";

export function RecordingsPage() {
	const status = useStatus();
	const channels = useChannels();
	const recording = status.data?.recording ?? false;
	const library = status.data?.library ?? false;
	const schedules = useSchedules(recording);
	const recordings = useRecordings(library);
	const scheduleMutation = useScheduleMutation();
	const deletion = useDeleteRecording();
	const [confirmingId, setConfirmingId] = useState<number | null>(null);
	const channelNames = useMemo(
		() => new Map(channels.data?.map((c) => [c.id, c.name])),
		[channels.data],
	);

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

	const scheduleTarget = scheduleMutation.variables?.programId ?? null;
	// 終わった予約は録画の欄に載るので、予約の欄には出さない。録画中のものは止める操作がある予約の欄に出す。
	const pendingSchedules = library
		? schedules.data.filter((s) => s.state !== "finished")
		: schedules.data;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
			{library && (
				<section className="flex flex-col gap-2">
					<h2 className="text-title">録画</h2>
					<RecordingList
						recordings={(recordings.data ?? []).filter((r) => r.state !== "recording")}
						channelNames={channelNames}
						confirmingId={confirmingId}
						deletingId={deletion.isPending ? deletion.variables : null}
						failedId={deletion.isError ? deletion.variables : null}
						onDeleteRequest={setConfirmingId}
						onDelete={(programId) => {
							deletion.mutate(programId, {
								onSuccess: () => {
									setConfirmingId(null);
								},
							});
						}}
					/>
				</section>
			)}
			<section className="flex flex-col gap-2">
				<h2 className="text-title">録画予約</h2>
				<ScheduleList
					schedules={pendingSchedules}
					channelNames={channelNames}
					pendingId={scheduleMutation.isPending ? scheduleTarget : null}
					failedId={scheduleMutation.isError ? scheduleTarget : null}
					onCancel={(programId) => {
						scheduleMutation.mutate({ programId, scheduled: false });
					}}
				/>
			</section>
		</div>
	);
}
