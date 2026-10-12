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
			className="m-auto max-h-[85dvh] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl bg-zinc-900 p-0 text-zinc-100 ring-1 ring-zinc-700 backdrop:bg-black/70"
		>
			<div className="flex flex-col gap-4 p-6">
				<div className="flex flex-col gap-1">
					<p className="text-sm text-zinc-400">
						{channel?.name} ・ {formatDate(program.startAt)}{" "}
						{formatRange(program.startAt, program.duration)}
					</p>
					<h2 className="text-lg leading-snug font-semibold">{program.name}</h2>
					<p className="text-xs text-zinc-500">{genreStyle(program.genres).label}</p>
				</div>
				<p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
					{program.description}
				</p>
				{detail.data?.extended.map((item) => (
					<div key={item.key} className="flex flex-col gap-1">
						<h3 className="text-sm font-semibold text-zinc-200">{item.key}</h3>
						<p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-400">
							{item.value}
						</p>
					</div>
				))}
				<div className="flex justify-end gap-2">
					<button
						type="button"
						className="rounded-md px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
						onClick={() => {
							dialogRef.current?.close();
						}}
					>
						閉じる
					</button>
					{onAir && (
						<a
							href={watchPath(program.serviceId)}
							className="rounded-md bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-200"
						>
							視聴する
						</a>
					)}
				</div>
			</div>
		</dialog>
	);
}
