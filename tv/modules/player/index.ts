import type { Codec } from "@moontv/core/api/schemas";
import { requireNativeModule, requireNativeView } from "expo";
import type { ComponentType, Ref } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

export type PlaybackState = "idle" | "buffering" | "ready" | "ended";

type NativeModule = {
	supportsCodec: (codec: Codec) => boolean;
};

export type PlayerViewHandle = {
	seekBy: (offsetMs: number) => Promise<void>;
};

export type Progress = { positionMs: number; durationMs?: number };

export type PlayerViewProps = ViewProps & {
	ref?: Ref<PlayerViewHandle>;
	source: string | null;
	/** 文字スーパー（速報など）はこの値によらず出す。 */
	showCaption: boolean;
	paused?: boolean;
	onPlaybackState?: (event: NativeSyntheticEvent<{ state: PlaybackState }>) => void;
	onPlaybackError?: (event: NativeSyntheticEvent<{ message: string }>) => void;
	/** 再生中は 1 秒ごと、止めたときとシークしたときにも届く。 */
	onProgress?: (event: NativeSyntheticEvent<Progress>) => void;
};

const nativeModule = requireNativeModule<NativeModule>("MoontvPlayer");

export const supportsCodec = (codec: Codec) => nativeModule.supportsCodec(codec);

export const PlayerView: ComponentType<PlayerViewProps> = requireNativeView("MoontvPlayer");
