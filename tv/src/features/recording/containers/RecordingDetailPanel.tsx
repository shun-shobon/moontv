import { useDeleteRecording } from "@moontv/core/api/queries";
import type { Channel, Recording } from "@moontv/core/api/schemas";

import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { RecordingDetail } from "../components/RecordingDetail";

type Props = {
	recording: Recording;
	channel: Channel | undefined;
	onPlay: () => void;
	onClose: () => void;
	onDeleted: () => void;
};

export function RecordingDetailPanel({ recording, channel, onPlay, onClose, onDeleted }: Props) {
	const deletion = useDeleteRecording();
	useBackHandler(onClose);

	return (
		<RecordingDetail
			recording={recording}
			channel={channel}
			deletion={{ isPending: deletion.isPending, failed: deletion.isError }}
			onPlay={onPlay}
			onDelete={() => {
				deletion.mutate(recording.program.id, { onSuccess: onDeleted });
			}}
			onClose={onClose}
		/>
	);
}
