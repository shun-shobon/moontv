import {
	Controls,
	FullscreenButton,
	PiPButton,
	PlayButton,
	SeekButton,
	Time,
	TimeSlider,
} from "@videojs/react";
import {
	CaptionsOffIcon,
	CaptionsOnIcon,
	FullscreenEnterIcon,
	FullscreenExitIcon,
	PauseIcon,
	PipEnterIcon,
	PipExitIcon,
	PlayIcon,
	SeekIcon,
} from "@videojs/react/icons";
import { ToggleButton } from "react-aria-components";

import { CONTROL_BUTTON } from "../services/control-style";
import { VolumeControl } from "./VolumeControl";

/** 録画のコマーシャルや聞き逃しを想定し、戻すのは短く、送るのは長くする。 */
const BACK_SECONDS = 10;
const FORWARD_SECONDS = 30;

type Props = {
	captions: boolean;
	onCaptionsChange: (captions: boolean) => void;
};

export function RecordingControls({ captions, onCaptionsChange }: Props) {
	return (
		<Controls.Root>
			<Controls.Content className="absolute inset-x-0 bottom-0 flex flex-col bg-linear-to-t from-scrim/90 to-transparent px-3 pt-6 text-fg transition-opacity duration-200 not-data-visible:pointer-events-none not-data-visible:opacity-0">
				{/* シークは指を離したときに行われ、それまで fill は再生位置のままなので、ドラッグ中は指の位置を表示する。 */}
				<TimeSlider.Root
					aria-label="再生位置"
					className="group/time relative flex h-5 w-full cursor-pointer items-center focus-ring"
				>
					<TimeSlider.Track className="relative h-1 w-full rounded-full bg-fg/25 transition-[height] duration-150 group-hover/time:h-1.5">
						<TimeSlider.Buffer className="absolute inset-y-0 left-0 w-(--media-slider-buffer) rounded-full bg-fg/25" />
						<TimeSlider.Fill className="absolute inset-y-0 left-0 w-(--media-slider-fill) rounded-full bg-accent group-data-dragging/time:w-(--media-slider-pointer)" />
					</TimeSlider.Track>
					<TimeSlider.Thumb className="absolute left-(--media-slider-fill) size-3 -translate-x-1/2 rounded-full bg-fg shadow transition-transform duration-150 group-hover/time:scale-125 group-data-dragging/time:left-(--media-slider-pointer) group-data-dragging/time:scale-125" />
					<TimeSlider.Preview className="pointer-events-none absolute bottom-full left-(--media-slider-pointer) mb-2 -translate-x-1/2 rounded-md bg-overlay px-2 py-0.5 text-caption-strong tabular-nums opacity-0 transition-opacity group-hover/time:opacity-100 group-data-dragging/time:opacity-100">
						<TimeSlider.Value type="pointer" />
					</TimeSlider.Preview>
				</TimeSlider.Root>
				<Controls.Group aria-label="再生コントロール" className="-mx-2 flex h-12 items-center">
					<PlayButton
						className={CONTROL_BUTTON}
						render={(props, state) => (
							<button {...props}>{state.paused ? <PlayIcon /> : <PauseIcon />}</button>
						)}
					/>
					<SeekButton
						seconds={-BACK_SECONDS}
						className={CONTROL_BUTTON}
						render={(props) => (
							<button {...props}>
								<SeekIcon className="-scale-x-100" />
							</button>
						)}
					/>
					<SeekButton
						seconds={FORWARD_SECONDS}
						className={CONTROL_BUTTON}
						render={(props) => (
							<button {...props}>
								<SeekIcon />
							</button>
						)}
					/>
					<VolumeControl hideSliderOnPhone />
					<span className="px-1 text-caption-strong whitespace-nowrap tabular-nums">
						<Time.Value type="current" />
						<span className="px-1 text-fg-muted">/</span>
						<Time.Value type="duration" className="text-fg-muted" />
					</span>
					<div className="flex-1" />
					<ToggleButton
						aria-label="字幕"
						isSelected={captions}
						onChange={onCaptionsChange}
						className={CONTROL_BUTTON}
					>
						{captions ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
					</ToggleButton>
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
