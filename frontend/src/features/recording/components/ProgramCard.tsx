import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Link } from "react-aria-components";

import type { Channel, Program } from "../../../shared/api/schemas";
import { ChannelBadge } from "../../../shared/components/ChannelBadge";
import { formatMarks } from "../../../shared/domain/program-marks";
import { formatDate, formatRange } from "../../../shared/domain/time";
import { cardClassName } from "../../../shared/services/card-style";
import { formatDuration } from "../domain/duration";

export type CardStatus = { label: string; tone: "accent" | "muted" };

type Props = {
	program: Program;
	channel: Channel | undefined;
	/** 録画の長さ。録画していなければ null。 */
	durationMs: number | null;
	status: CardStatus | null;
	/** 再生できる録画なら、カード全体をリンクにする。 */
	href: string | null;
	active: boolean;
	/** リンクの中にはボタンを置けないので、href がないカードにだけ置く。 */
	action: ReactNode;
};

export function ProgramCard({ program, channel, durationMs, status, href, active, action }: Props) {
	const content = (
		<>
			<div className="flex items-center gap-3">
				{channel != null && <ChannelBadge channel={channel} />}
				<span className="truncate text-label text-fg-muted">
					{channel?.name ?? "不明なチャンネル"}
				</span>
			</div>
			<div className="flex flex-col gap-1">
				<p className="line-clamp-2 text-label text-fg">{program.name}</p>
				<p className="text-caption text-fg-subtle tabular-nums">
					{formatDate(program.startAt)} {formatRange(program.startAt, program.duration)}
					{durationMs != null && <span className="ml-2">{formatDuration(durationMs)}</span>}
					{program.marks.length > 0 && <span className="ml-2">{formatMarks(program.marks)}</span>}
				</p>
			</div>
			{status != null && (
				<p
					className={clsx(
						"text-caption",
						status.tone === "accent" ? "text-accent" : "text-fg-muted",
					)}
				>
					{status.label}
				</p>
			)}
		</>
	);

	if (href != null) {
		return (
			<Link
				href={href}
				aria-current={active ? "page" : undefined}
				className={cardClassName({ active, interactive: true })}
			>
				{content}
			</Link>
		);
	}
	return (
		<div className={cardClassName({ active, interactive: false })}>
			{content}
			{action != null && <div className="-mr-2 -mb-2 flex justify-end">{action}</div>}
		</div>
	);
}
