import { Dialog, Heading } from "react-aria-components";

import type { Channel, Program } from "../../../shared/api/schemas";
import { Button } from "../../../shared/components/Button";
import { ButtonLink } from "../../../shared/components/ButtonLink";
import { Sheet } from "../../../shared/components/Sheet";
import { formatMarks } from "../../../shared/domain/program-marks";
import { formatDate, formatRange, isOnAir } from "../../../shared/domain/time";
import { watchPath } from "../../../shared/services/routes";
import type { ProgramDetail } from "../api/schemas";
import { genreStyle } from "../domain/genre";

type Props = {
	program: Program;
	channel: Channel | undefined;
	extended: ProgramDetail["extended"] | undefined;
	now: number;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
};

export function ProgramDialog({ program, channel, extended, now, isOpen, onOpenChange }: Props) {
	const onAir = isOnAir(program.startAt, program.duration, now);

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
				<div className="flex shrink-0 justify-end gap-2 border-t border-line px-6 py-3">
					<Button variant="quiet" slot="close">
						閉じる
					</Button>
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
