import { Controls, FullscreenButton, LiveButton, PiPButton } from "@videojs/react";
import {
	FullscreenEnterIcon,
	FullscreenExitIcon,
	PipEnterIcon,
	PipExitIcon,
} from "@videojs/react/icons";

import { CONTROL_BUTTON } from "../services/control-style";
import type { PlayerSettingsProps } from "./PlayerSettings";
import { PlayerSettings } from "./PlayerSettings";
import { VolumeControl } from "./VolumeControl";

export function PlayerControls({ settings }: { settings: PlayerSettingsProps }) {
	return (
		<Controls.Root>
			<Controls.Content className="absolute inset-x-0 bottom-0 transition-opacity duration-200 not-data-visible:pointer-events-none not-data-visible:opacity-0">
				<Controls.Group
					aria-label="再生コントロール"
					className="flex h-12 items-center bg-linear-to-t from-scrim/90 to-transparent px-1 text-fg"
				>
					<VolumeControl />
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
