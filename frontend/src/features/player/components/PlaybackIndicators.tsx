import { SeekIndicator, StatusIndicator } from "@videojs/react";
import { PauseIcon, PlayIcon, SeekIcon } from "@videojs/react/icons";

/** クリック・キー・ダブルタップで再生状態や位置を変えたことを、映像の上に一瞬だけ出す。 */
export function PlaybackIndicators() {
	return (
		<>
			<StatusIndicator.Root
				actions={["togglePaused"]}
				className="group/status pointer-events-none absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-canvas/75 text-fg transition duration-300 ease-out data-ending-style:scale-125 data-ending-style:opacity-0 data-starting-style:scale-75 data-starting-style:opacity-0"
			>
				<PlayIcon className="hidden size-9 group-data-[status=play]/status:block" />
				<PauseIcon className="hidden size-9 group-data-[status=pause]/status:block" />
			</StatusIndicator.Root>
			<SeekIndicator.Root className="group/seek pointer-events-none absolute inset-y-0 flex w-1/3 items-center justify-center transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 data-[direction=backward]:left-0 data-[direction=forward]:right-0">
				<div className="flex items-center gap-2 rounded-full bg-canvas/75 px-4 py-2 text-fg">
					<SeekIcon className="size-6 group-data-[direction=backward]/seek:-scale-x-100" />
					<SeekIndicator.Value className="text-caption-strong tabular-nums" />
				</div>
			</SeekIndicator.Root>
		</>
	);
}
