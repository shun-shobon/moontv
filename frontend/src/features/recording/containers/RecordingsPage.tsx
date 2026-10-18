import { useMemo } from "react";

import {
	useChannels,
	useScheduleMutation,
	useSchedules,
	useStatus,
} from "../../../shared/api/queries";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { ScheduleList } from "../components/ScheduleList";

export function RecordingsPage() {
	const status = useStatus();
	const channels = useChannels();
	const recording = status.data?.recording ?? false;
	const schedules = useSchedules(recording);
	const mutation = useScheduleMutation();
	const channelNames = useMemo(
		() => new Map(channels.data?.map((c) => [c.id, c.name])),
		[channels.data],
	);

	if (status.isError || schedules.isError) {
		return <StatusMessage>録画予約を取得できませんでした。</StatusMessage>;
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
	if (schedules.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}

	const targetId = mutation.variables?.programId ?? null;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4">
			<h1 className="text-title">録画予約</h1>
			<ScheduleList
				schedules={schedules.data}
				channelNames={channelNames}
				pendingId={mutation.isPending ? targetId : null}
				failedId={mutation.isError ? targetId : null}
				onCancel={(programId) => {
					mutation.mutate({ programId, scheduled: false });
				}}
			/>
		</div>
	);
}
