import { useScheduleMutation, useSchedules, useStatus, useProgram } from "@moontv/core/api/queries";
import type { Channel, Program } from "@moontv/core/api/schemas";

import { ProgramDialog } from "../components/ProgramDialog";

type Props = {
	program: Program;
	channel: Channel | undefined;
	now: number;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
};

export function ProgramDetailDialog({ program, channel, now, isOpen, onOpenChange }: Props) {
	const detail = useProgram(program.id);
	const recording = useStatus().data?.recording ?? false;
	const schedules = useSchedules(recording);
	const mutation = useScheduleMutation();
	const schedule = schedules.data?.find((s) => s.program.id === program.id);
	// 別の番組を操作した結果を出さない。
	const mutatedHere = mutation.variables?.programId === program.id;

	return (
		<ProgramDialog
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
			isOpen={isOpen}
			onOpenChange={onOpenChange}
		/>
	);
}
