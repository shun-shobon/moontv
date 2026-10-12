import { GearIcon } from "@videojs/react/icons";
import { useCallback, useRef, useState } from "react";

import type { Codec, Quality } from "../../../shared/api/schemas";
import { useOutsidePointerDown } from "../hooks/useOutsidePointerDown";
import type { Preferences } from "../media/preferences";
import { codecOptionLabel, codecOptions } from "../services/player-settings";
import { OptionGroup } from "./OptionGroup";

export type PlayerSettingsProps = {
	qualities: readonly Quality[];
	codecs: readonly Codec[];
	activeCodec: Codec;
	preferences: Preferences;
	onChange: (preferences: Preferences) => void;
};

export function PlayerSettings({
	qualities,
	codecs,
	activeCodec,
	preferences,
	onChange,
}: PlayerSettingsProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const close = useCallback(() => {
		setOpen(false);
	}, []);
	useOutsidePointerDown(rootRef, open, close);

	const select = (next: Preferences) => {
		onChange(next);
		close();
	};

	return (
		<div ref={rootRef} className="relative flex h-full items-center">
			<button
				type="button"
				aria-label="画質設定"
				aria-expanded={open}
				title="画質設定"
				className="flex h-full w-16 items-center justify-center gap-1 text-caption-strong"
				onClick={() => {
					setOpen((v) => !v);
				}}
			>
				<GearIcon />
				<span className="tabular-nums">{preferences.quality}</span>
			</button>
			{open && (
				<div className="absolute right-0 bottom-full mb-2 flex w-48 flex-col gap-3 rounded-lg bg-overlay/95 p-3 text-left text-label shadow-xl ring-1 ring-line-strong">
					<OptionGroup
						label="画質"
						options={qualities}
						value={preferences.quality}
						format={(q) => q}
						onSelect={(quality) => {
							select({ ...preferences, quality });
						}}
					/>
					<OptionGroup
						label="コーデック"
						options={codecOptions(codecs)}
						value={preferences.codec}
						format={(c) => codecOptionLabel(c, activeCodec)}
						onSelect={(codec) => {
							select({ ...preferences, codec });
						}}
					/>
				</div>
			)}
		</div>
	);
}
