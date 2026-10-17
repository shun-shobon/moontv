import type { Channel, Program } from "../../../shared/api/schemas";
import { useProgram } from "../api/queries";
import { ProgramDialog } from "../components/ProgramDialog";

type Props = {
	program: Program;
	channel: Channel | undefined;
	now: number;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
};

/** 一覧の番組情報で先に開き、詳細は取得でき次第追加する。 */
export function ProgramDetailDialog({ program, channel, now, isOpen, onOpenChange }: Props) {
	const detail = useProgram(program.id);

	return (
		<ProgramDialog
			program={program}
			channel={channel}
			extended={detail.data?.extended}
			now={now}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
		/>
	);
}
