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

/**
 * Video.js のコントロールバー内に React Portal で描画する設定メニュー。
 * `.video-js button` が display と background を上書きするため、それらには `!` を付けている。
 */
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
				className="text-caption-strong flex! h-full w-16 items-center justify-center gap-1"
				onClick={() => {
					setOpen((v) => !v);
				}}
			>
				<GearIcon />
				<span className="tabular-nums">{preferences.quality}</span>
			</button>
			{open && (
				<div className="bg-overlay/95 ring-line-strong text-label absolute right-0 bottom-full mb-2 flex w-48 flex-col gap-3 rounded-lg p-3 text-left shadow-xl ring-1">
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
			<legend className="text-fg-muted text-caption mb-1">{label}</legend>
			{options.map((option) => {
				const active = option === value;
				return (
					<button
						key={option}
						type="button"
						aria-pressed={active}
						className={`flex! items-center justify-between rounded-md px-2 py-1.5 text-left ${active ? "bg-selected! text-fg" : "text-fg-secondary hover:bg-surface-hover!"}`}
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

function GearIcon() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 24 24"
			className="size-4"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
			<path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
		</svg>
	);
}
