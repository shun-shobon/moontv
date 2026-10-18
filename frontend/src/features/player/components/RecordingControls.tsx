import {
	Controls,
	FullscreenButton,
	Gesture,
	Hotkey,
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

const SKIP_SECONDS = 10;

type Props = {
	captions: boolean;
	onCaptionsChange: (captions: boolean) => void;
};

const CENTER_BUTTON =
	"flex items-center justify-center rounded-full bg-canvas/75 text-fg focus-ring transition duration-150 ease-out pointer-events-auto hover:text-fg-accent-hover active:scale-90";

export function RecordingControls({ captions, onCaptionsChange }: Props) {
	return (
		<Controls.Root>
			{/* ホバーできる端末はどこをクリックしても再生・停止でき、ホバーできない端末はタップで操作を出し入れする。 */}
			<Gesture type="tap" action="togglePaused" pointer="mouse" />
			<Gesture type="tap" action="toggleControls" pointer="touch" />
			<Gesture
				type="doubletap"
				action="seekStep"
				value={-SKIP_SECONDS}
				pointer="touch"
				region="left"
			/>
			<Gesture
				type="doubletap"
				action="seekStep"
				value={SKIP_SECONDS}
				pointer="touch"
				region="right"
			/>
			<Hotkey keys="Space" action="togglePaused" target="document" />
			<Hotkey keys="ArrowLeft" action="seekStep" value={-SKIP_SECONDS} target="document" />
			<Hotkey keys="ArrowRight" action="seekStep" value={SKIP_SECONDS} target="document" />
			{/* ホバーできる端末はクリックで再生・停止できるので、中央の操作はタッチの端末にだけ出す。 */}
			<Controls.Content className="pointer-events-none absolute inset-0 flex items-center justify-center gap-8 transition-[opacity,visibility] duration-200 not-data-visible:invisible not-data-visible:opacity-0 [@media(hover:hover)]:hidden">
				<SeekButton
					seconds={-SKIP_SECONDS}
					className={`${CENTER_BUTTON} size-12`}
					render={(props) => (
						<button {...props}>
							<SeekIcon className="size-6 -scale-x-100" />
						</button>
					)}
				/>
				<PlayButton
					className={`${CENTER_BUTTON} size-16`}
					render={(props, state) => (
						<button {...props}>
							{state.paused ? <PlayIcon className="size-9" /> : <PauseIcon className="size-9" />}
						</button>
					)}
				/>
				<SeekButton
					seconds={SKIP_SECONDS}
					className={`${CENTER_BUTTON} size-12`}
					render={(props) => (
						<button {...props}>
							<SeekIcon className="size-6" />
						</button>
					)}
				/>
			</Controls.Content>
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
					{/* Preview は自身の幅の半分ずらして指の真上に置く。その幅に自身の余白は入らないので、余白と背景は内側に付ける。 */}
					<TimeSlider.Preview className="bottom-full mb-2 opacity-0 transition-opacity group-hover/time:opacity-100 group-data-dragging/time:opacity-100">
						<TimeSlider.Value
							type="pointer"
							className="block rounded-md bg-overlay px-2 py-0.5 text-caption-strong tabular-nums"
						/>
					</TimeSlider.Preview>
				</TimeSlider.Root>
				<Controls.Group aria-label="再生コントロール" className="-mx-2 flex h-12 items-center">
					<PlayButton
						className={CONTROL_BUTTON}
						render={(props, state) => (
							<button {...props}>{state.paused ? <PlayIcon /> : <PauseIcon />}</button>
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
