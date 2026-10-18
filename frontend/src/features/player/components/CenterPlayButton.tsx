import { PlayButton } from "@videojs/react";
import { PlayIcon } from "@videojs/react/icons";

/** 一時停止ボタンを置かないので、OS などに止められたときの再開手段として出す。 */
export function CenterPlayButton() {
	return (
		<PlayButton
			className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-canvas/75 text-fg focus-ring transition duration-200 ease-out hover:scale-110 hover:text-fg-accent-hover active:scale-95 starting:scale-75 starting:opacity-0"
			render={(props, state) =>
				state.paused ? (
					<button {...props}>
						<PlayIcon className="size-9" />
					</button>
				) : null
			}
		/>
	);
}
