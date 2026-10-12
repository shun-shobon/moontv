import { useEffect, useRef } from "react";

import { useProgram } from "../api/queries";
import type { Channel, Program } from "../api/schemas";
import { genreStyle } from "../domain/genre";
import { formatDate, formatRange, isOnAir } from "../domain/time";
import { watchPath } from "./router";

type Props = {
	program: Program;
	channel: Channel | undefined;
	now: number;
	onClose: () => void;
};

export function ProgramDialog({ program, channel, now, onClose }: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const detail = useProgram(program.id);
	const onAir = isOnAir(program.startAt, program.duration, now);

	useEffect(() => {
		dialogRef.current?.showModal();
	}, []);

	return (
		<dialog
			ref={dialogRef}
			onClose={onClose}
			className="bg-surface text-fg ring-line-strong backdrop:bg-scrim/70 m-auto max-h-[85dvh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl p-0 ring-1"
		>
			<div className="flex flex-col gap-4 p-6">
				<div className="flex flex-col gap-1">
					<p className="text-fg-muted text-sm">
						{channel?.name} ・ {formatDate(program.startAt)}{" "}
						{formatRange(program.startAt, program.duration)}
					</p>
					<h2 className="text-lg leading-snug font-semibold">{program.name}</h2>
					<p className="text-fg-subtle text-xs">{genreStyle(program.genres).label}</p>
				</div>
				<p className="text-fg-secondary text-sm leading-relaxed whitespace-pre-wrap">
					{program.description}
				</p>
				{detail.data?.extended.map((item) => (
					<div key={item.key} className="flex flex-col gap-1">
						<h3 className="text-fg text-sm font-semibold">{item.key}</h3>
						<p className="text-fg-muted text-sm leading-relaxed whitespace-pre-wrap">
							{item.value}
						</p>
					</div>
				))}
				<div className="flex justify-end gap-2">
					<button
						type="button"
						className="text-fg-secondary hover:bg-surface-hover rounded-md px-4 py-2 text-sm"
						onClick={() => {
							dialogRef.current?.close();
						}}
					>
						閉じる
					</button>
					{onAir && (
						<a
							href={watchPath(program.serviceId)}
							className="bg-accent text-on-accent hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium"
						>
							視聴する
						</a>
					)}
				</div>
			</div>
		</dialog>
	);
}
