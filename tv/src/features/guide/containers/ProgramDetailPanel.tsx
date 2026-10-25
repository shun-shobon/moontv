import { useProgram, useScheduleMutation, useSchedules, useStatus } from "@moontv/core/api/queries";
import type { Channel, Program } from "@moontv/core/api/schemas";

import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { ProgramDetail } from "../components/ProgramDetail";

type Props = {
	program: Program;
	channel: Channel | undefined;
	now: number;
	onWatch: () => void;
	onClose: () => void;
};

export function ProgramDetailPanel({ program, channel, now, onWatch, onClose }: Props) {
	const detail = useProgram(program.id);
	const recording = useStatus().data?.recording ?? false;
	const schedules = useSchedules(recording);
	const mutation = useScheduleMutation();
	const schedule = schedules.data?.find((s) => s.program.id === program.id);
	// 別の番組を操作した結果を出さない。
	const mutatedHere = mutation.variables?.programId === program.id;
	useBackHandler(onClose);

	return (
		<ProgramDetail
			program={program}
			channel={channel}
			extended={detail.data?.extended}
			reservation={
				recording && schedules.data != null
					? {
							state: schedule?.state ?? null,
							isPending: mutatedHere && mutation.isPending,
							failed: mutatedHere && mutation.isError,
							onChange: (scheduled) => {
								mutation.mutate({ programId: program.id, scheduled });
							},
						}
					: null
			}
			now={now}
			onWatch={onWatch}
			onClose={onClose}
		/>
	);
}
