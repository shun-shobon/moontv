import { GearIcon } from "@videojs/react/icons";
import { usePlayer } from "@videojs/react/live-video";
import { useEffect, useState } from "react";
import { Button, Menu, MenuTrigger, Popover, Separator } from "react-aria-components";
import { useUNSAFE_PortalContext } from "react-aria/PortalProvider";

import type { Audio, AudioTrack, Codec, Quality } from "../../../shared/api/schemas";
import { Sheet } from "../../../shared/components/Sheet";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";
import { PHONE_MEDIA_QUERY } from "../../../shared/services/breakpoints";
import type { Preferences } from "../media/preferences";
import { audioOptionLabel, codecOptionLabel, codecOptions } from "../services/player-settings";
import { OptionGroup } from "./OptionGroup";
import { ToggleOption } from "./ToggleOption";

export type PlayerSettingsProps = {
	qualities: readonly Quality[];
	codecs: readonly Codec[];
	activeCodec: Codec;
	preferences: Preferences;
	onChange: (preferences: Preferences) => void;
	/** 放送中の番組の音声。2本以上あるときだけ選べるようにする。 */
	audios: readonly Audio[];
	audio: AudioTrack;
	onAudioChange: (audio: AudioTrack) => void;
};

export function PlayerSettings({
	qualities,
	codecs,
	activeCodec,
	preferences,
	onChange,
	audios,
	audio,
	onAudioChange,
}: PlayerSettingsProps) {
	// 既定の基準は body なので、描画先のプレイヤーに収まる位置と高さを計算させる。プレイヤーが小さいと上にはみ出て切れるため。
	const { getContainer } = useUNSAFE_PortalContext();
	const boundary = getContainer?.() ?? undefined;
	// 小さなポップオーバーでは選びにくいので、スマホ幅では下から出るシートにする。
	const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);

	const [open, setOpen] = useState(false);
	// 開いている間にポインターが止まっても、操作バーごとメニューの起点が消えないようにする。
	const requestControlsLock = usePlayer((state) => state.requestControlsLock);
	useEffect(() => (open ? requestControlsLock() : undefined), [open, requestControlsLock]);

	const menu = (
		<Menu aria-label="再生設定" className="flex flex-col gap-1 outline-none">
			<OptionGroup
				label="画質"
				options={qualities}
				value={preferences.quality}
				format={(q) => q}
				onSelect={(quality) => {
					onChange({ ...preferences, quality });
				}}
			/>
			<Separator className="mx-2.5 border-t border-line-strong" />
			{/* コーデックより先に置き、プレイヤーが低くてメニューが切れても副音声があることに気づけるようにする。 */}
			{audios.length >= 2 && (
				<>
					<OptionGroup
						label="音声"
						options={audios.map((a) => a.track)}
						value={audio}
						format={(track) => audioOptionLabel(track, audios)}
						onSelect={onAudioChange}
					/>
					<Separator className="mx-2.5 border-t border-line-strong" />
				</>
			)}
			<OptionGroup
				label="コーデック"
				options={codecOptions(codecs)}
				value={preferences.codec}
				format={(c) => codecOptionLabel(c, activeCodec)}
				onSelect={(codec) => {
					onChange({ ...preferences, codec });
				}}
			/>
			<Separator className="mx-2.5 border-t border-line-strong" />
			<ToggleOption
				label="字幕"
				checked={preferences.captions}
				onToggle={(captions) => {
					onChange({ ...preferences, captions });
				}}
			/>
			<ToggleOption
				label="アンビエントモード"
				checked={preferences.ambient}
				onToggle={(ambient) => {
					onChange({ ...preferences, ambient });
				}}
			/>
		</Menu>
	);

	return (
		<MenuTrigger isOpen={open} onOpenChange={setOpen}>
			<Button
				aria-label="再生設定"
				className="group flex h-full w-16 items-center justify-center gap-1 text-caption-strong focus-ring transition-colors data-hovered:text-accent-hover"
			>
				<GearIcon className="transition-transform duration-500 ease-out group-aria-expanded:rotate-90" />
				<span className="tabular-nums">{preferences.quality}</span>
			</Button>
			{isPhone ? (
				<Sheet blurBackdrop={false}>
					<div className="min-h-0 overflow-y-auto p-2 text-label">{menu}</div>
				</Sheet>
			) : (
				<Popover
					placement="top end"
					offset={8}
					boundaryElement={boundary}
					// React Aria が style で z-index を付けるため、class ではなく style で上書きする。
					style={{ zIndex: "var(--z-index-popover)" }}
					className="w-56 origin-(--trigger-anchor-point) overflow-y-auto rounded-xl bg-overlay/90 p-1.5 text-label shadow-2xl ring-1 ring-line-strong backdrop-blur-md transition duration-200 ease-out data-entering:translate-y-1 data-entering:scale-95 data-entering:opacity-0 data-exiting:scale-95 data-exiting:opacity-0 data-exiting:duration-150"
				>
					{menu}
				</Popover>
			)}
		</MenuTrigger>
	);
}
