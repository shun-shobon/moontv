import {
	Controls,
	FullscreenButton,
	LiveButton,
	MuteButton,
	PiPButton,
	VolumeSlider,
} from "@videojs/react";
import {
	FullscreenEnterIcon,
	FullscreenExitIcon,
	PipEnterIcon,
	PipExitIcon,
	VolumeHighIcon,
	VolumeLowIcon,
	VolumeOffIcon,
} from "@videojs/react/icons";

import type { PlayerSettingsProps } from "./PlayerSettings";
import { PlayerSettings } from "./PlayerSettings";

const CONTROL_BUTTON =
	"flex h-full w-10 items-center justify-center text-fg hover:text-accent-hover data-disabled:opacity-50";

export function PlayerControls({ settings }: { settings: PlayerSettingsProps }) {
	return (
		<Controls.Root>
			<Controls.Content className="absolute inset-x-0 bottom-0 transition-opacity duration-200 not-data-visible:pointer-events-none not-data-visible:opacity-0">
				<Controls.Group
					aria-label="再生コントロール"
					className="flex h-10 items-center bg-canvas/75 text-fg"
				>
					<MuteButton
						className={CONTROL_BUTTON}
						render={(props, state) => (
							<button {...props}>
								{state.volumeLevel === "off" ? (
									<VolumeOffIcon />
								) : state.volumeLevel === "high" ? (
									<VolumeHighIcon />
								) : (
									<VolumeLowIcon />
								)}
							</button>
						)}
					/>
					<VolumeSlider.Root className="relative mr-2 flex h-full w-20 cursor-pointer items-center">
						<VolumeSlider.Track className="relative h-1 w-full rounded-full bg-fg/30">
							<VolumeSlider.Fill className="absolute inset-y-0 left-0 w-(--media-slider-fill) rounded-full bg-accent" />
						</VolumeSlider.Track>
						<VolumeSlider.Thumb className="absolute left-(--media-slider-fill) size-3 -translate-x-1/2 rounded-full bg-fg" />
					</VolumeSlider.Root>
					<LiveButton className="group/live flex h-full items-center gap-1.5 px-2 text-caption-strong text-fg-secondary not-data-live:hidden data-live-edge:text-fg">
						<span className="size-2 rounded-full bg-fg-muted group-data-live-edge/live:bg-accent" />
						ライブ
					</LiveButton>
					<div className="flex-1" />
					<PlayerSettings {...settings} />
					<PiPButton
						className={CONTROL_BUTTON}
						render={(props, state) => (
							<button {...props}>{state.pip ? <PipExitIcon /> : <PipEnterIcon />}</button>
						)}
					/>
					<FullscreenButton
						className={CONTROL_BUTTON}
						render={(props, state) => (
							<button {...props}>
								{state.fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
							</button>
						)}
					/>
				</Controls.Group>
			</Controls.Content>
		</Controls.Root>
	);
}
