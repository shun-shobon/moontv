import { MuteButton, VolumeSlider } from "@videojs/react";
import { VolumeHighIcon, VolumeLowIcon, VolumeOffIcon } from "@videojs/react/icons";
import { clsx } from "clsx";

import { CONTROL_BUTTON } from "../services/control-style";

type Props = {
	/** 操作が多くて横幅が足りないときに、スマホ幅ではスライダーを隠す。スマホは本体のボタンで音量を変えられる。 */
	hideSliderOnPhone?: boolean;
};

export function VolumeControl({ hideSliderOnPhone = false }: Props) {
	return (
		<>
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
			<VolumeSlider.Root
				className={clsx(
					"group/volume relative mr-2 flex h-full w-20 cursor-pointer items-center",
					hideSliderOnPhone && "max-sm:hidden",
				)}
			>
				<VolumeSlider.Track className="relative h-1 w-full rounded-full bg-fg/30">
					<VolumeSlider.Fill className="absolute inset-y-0 left-0 w-(--media-slider-fill) rounded-full bg-accent" />
				</VolumeSlider.Track>
				<VolumeSlider.Thumb className="absolute left-(--media-slider-fill) size-3 -translate-x-1/2 rounded-full bg-fg shadow transition-transform duration-150 group-hover/volume:scale-125" />
			</VolumeSlider.Root>
		</>
	);
}
