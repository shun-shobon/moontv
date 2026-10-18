import type { Schedule } from "../../../shared/api/schemas";
import { Button } from "../../../shared/components/Button";
import { SCHEDULE_LABELS } from "../../../shared/domain/schedule";
import { formatDate, formatRange } from "../../../shared/domain/time";

type Props = {
	schedules: readonly Schedule[];
	channelNames: ReadonlyMap<number, string>;
	/** 取り消しを送っている、または送って失敗した番組。 */
	pendingId: number | null;
	failedId: number | null;
	onCancel: (programId: number) => void;
};

const CANCEL_LABELS = { scheduled: "取り消す", recording: "録画を止める" } as const;

export function ScheduleList({ schedules, channelNames, pendingId, failedId, onCancel }: Props) {
	if (schedules.length === 0) {
		return (
			<p className="py-8 text-center text-label text-fg-muted">
				録画予約はありません。番組表で番組を選ぶと予約できます。
			</p>
		);
	}

	return (
		<ul className="flex flex-col divide-y divide-line">
			{schedules.map(({ state, program }) => (
				<li key={program.id} className="flex items-center gap-3 py-3">
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<p className="text-caption text-fg-muted">
							{channelNames.get(program.serviceId)} ・ {formatDate(program.startAt)}{" "}
							{formatRange(program.startAt, program.duration)}
						</p>
						<p className="truncate text-label text-fg">{program.name}</p>
						<p
							className={
								state === "failed" ? "text-caption text-fg-muted" : "text-caption text-accent"
							}
						>
							{SCHEDULE_LABELS[state]}
							{failedId === program.id && (
								<span role="alert" className="ml-2 text-fg-muted">
									変更できませんでした
								</span>
							)}
						</p>
					</div>
					{(state === "scheduled" || state === "recording") && (
						<Button
							variant="quiet"
							isPending={pendingId === program.id}
							onPress={() => {
								onCancel(program.id);
							}}
						>
							{CANCEL_LABELS[state]}
						</Button>
					)}
				</li>
			))}
		</ul>
	);
}
