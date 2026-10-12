import { PlayButton } from "@videojs/react";
import { PlayIcon } from "@videojs/react/icons";

/** 一時停止ボタンを置かないので、OS などに止められたときの再開手段として出す。 */
export function CenterPlayButton() {
	return (
		<PlayButton
			className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-canvas/75 text-fg hover:text-accent-hover"
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
