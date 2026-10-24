import type { Channel, Program, ScheduleState, ProgramDetail } from "@moontv/core/api/schemas";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { SCHEDULE_LABELS } from "@moontv/core/domain/schedule";
import { formatDate, formatRange, isOnAir } from "@moontv/core/domain/time";
import { reservationAction } from "@moontv/core/services/reservation";
import { Dialog, Heading } from "react-aria-components";

import { Button } from "../../../shared/components/Button";
import { ButtonLink } from "../../../shared/components/ButtonLink";
import { Sheet } from "../../../shared/components/Sheet";
import { watchPath } from "../../../shared/services/routes";
import { genreStyle } from "../domain/genre";

export type Reservation = {
	state: ScheduleState | null;
	isPending: boolean;
	failed: boolean;
	onChange: (scheduled: boolean) => void;
};

type Props = {
	program: Program;
	channel: Channel | undefined;
	extended: ProgramDetail["extended"] | undefined;
	/** mirakc で録画が無効なら null。 */
	reservation: Reservation | null;
	now: number;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
};

export function ProgramDialog({
	program,
	channel,
	extended,
	reservation,
	now,
	isOpen,
	onOpenChange,
}: Props) {
	const onAir = isOnAir(program.startAt, program.duration, now);
	const ended = !onAir && program.startAt <= now;
	const scheduleState = reservation?.state ?? null;
	const action = reservationAction(scheduleState, ended);

	return (
		<Sheet isOpen={isOpen} onOpenChange={onOpenChange} blurBackdrop>
			<Dialog className="flex min-h-0 flex-col outline-none">
				<div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-6 pt-1 sm:pt-6">
					<div className="flex flex-col gap-1">
						<p className="text-label text-fg-muted">
							{channel?.name} ・ {formatDate(program.startAt)}{" "}
							{formatRange(program.startAt, program.duration)}
						</p>
						<Heading slot="title" className="text-title">
							{program.name}
						</Heading>
						<p className="text-caption text-fg-subtle">
							{genreStyle(program.genres).label}
							{program.marks.length > 0 && (
								<span className="ml-2">{formatMarks(program.marks)}</span>
							)}
							{scheduleState != null && (
								<span className="ml-2 text-fg-accent">{SCHEDULE_LABELS[scheduleState]}</span>
							)}
						</p>
					</div>
					<p className="text-body whitespace-pre-wrap text-fg-secondary">{program.description}</p>
					{extended === undefined ? (
						<div className="flex animate-pulse flex-col gap-2" aria-hidden>
							<div className="h-3 w-24 rounded-full bg-line" />
							<div className="h-3 w-full rounded-full bg-line" />
							<div className="h-3 w-2/3 rounded-full bg-line" />
						</div>
					) : (
						extended.map((item) => (
							<div
								key={item.key}
								className="flex flex-col gap-1 border-l-2 border-line-strong pl-3"
							>
								<h3 className="text-heading text-fg">{item.key}</h3>
								<p className="text-body whitespace-pre-wrap text-fg-muted">{item.value}</p>
							</div>
						))
					)}
				</div>
				<div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-3">
					{(reservation?.failed ?? false) && (
						<p role="alert" className="mr-auto text-caption text-fg-muted">
							録画予約を変更できませんでした
						</p>
					)}
					<Button variant="quiet" slot="close">
						閉じる
					</Button>
					{reservation != null && action != null && (
						<Button
							variant="quiet"
							isPending={reservation.isPending}
							onPress={() => {
								reservation.onChange(action.scheduled);
							}}
						>
							{action.label}
						</Button>
					)}
					{onAir && (
						<ButtonLink variant="primary" href={watchPath(program.serviceId)}>
							視聴する
						</ButtonLink>
					)}
				</div>
			</Dialog>
		</Sheet>
	);
}
