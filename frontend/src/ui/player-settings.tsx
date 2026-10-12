import { GearIcon } from "@videojs/react/icons";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

import type { Codec, Quality } from "../api/schemas";
import type { Preferences } from "../media/preferences";

export type StreamSettingsProps = {
	qualities: readonly Quality[];
	codecs: readonly Codec[];
	activeCodec: Codec;
	preferences: Preferences;
	onChange: (preferences: Preferences) => void;
};

const CODEC_LABELS: Record<Preferences["codec"], string> = {
	auto: "自動",
	hevc: "HEVC",
	h264: "H.264",
};

export function PlayerSettings({
	qualities,
	codecs,
	activeCodec,
	preferences,
	onChange,
}: StreamSettingsProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onPointerDown = (event: PointerEvent) => {
			const inside =
				event.target instanceof Node && (rootRef.current?.contains(event.target) ?? false);
			if (!inside) {
				setOpen(false);
			}
		};
		if (open) {
			document.addEventListener("pointerdown", onPointerDown);
		}
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
		};
	}, [open]);

	const select = (next: Preferences) => {
		onChange(next);
		setOpen(false);
	};

	const codecOptions: Preferences["codec"][] = ["auto", ...codecs];

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
						options={codecOptions}
						value={preferences.codec}
						format={(c) => (c === "auto" ? `自動 (${CODEC_LABELS[activeCodec]})` : CODEC_LABELS[c])}
						onSelect={(codec) => {
							select({ ...preferences, codec });
						}}
					/>
				</div>
			)}
		</div>
	);
}

type OptionGroupProps<T extends string> = {
	label: string;
	options: readonly T[];
	value: T;
	format: (value: T) => string;
	onSelect: (value: T) => void;
};

function OptionGroup<T extends string>({
	label,
	options,
	value,
	format,
	onSelect,
}: OptionGroupProps<T>) {
	return (
		<fieldset className="flex flex-col gap-1">
			<legend className="mb-1 text-caption text-fg-muted">{label}</legend>
			{options.map((option) => {
				const active = option === value;
				return (
					<button
						key={option}
						type="button"
						aria-pressed={active}
						className={clsx(
							"flex items-center justify-between rounded-md px-2 py-1.5 text-left",
							active ? "bg-selected text-fg" : "text-fg-secondary hover:bg-surface-hover",
						)}
						onClick={() => {
							onSelect(option);
						}}
					>
						{format(option)}
						{active && <span aria-hidden>✓</span>}
					</button>
				);
			})}
		</fieldset>
	);
}
