import { useProgram } from "../../api/queries";
import type { Channel, Program } from "../../api/schemas";
import { ProgramDialog } from "../components/ProgramDialog";

type Props = {
	program: Program;
	channel: Channel | undefined;
	now: number;
	onClose: () => void;
};

/** 一覧の番組情報で先に開き、詳細は取得でき次第追加する。 */
export function ProgramDetailDialog({ program, channel, now, onClose }: Props) {
	const detail = useProgram(program.id);

	return (
		<ProgramDialog
			program={program}
			channel={channel}
			extended={detail.data?.extended}
			now={now}
			onClose={onClose}
		/>
	);
}
