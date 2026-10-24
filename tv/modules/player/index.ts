import type { Codec } from "@moontv/core/api/schemas";
import { requireNativeModule, requireNativeView } from "expo";
import type { ComponentType } from "react";
import type { NativeSyntheticEvent, ViewProps } from "react-native";

export type PlaybackState = "idle" | "buffering" | "ready" | "ended";

type NativeModule = {
	supportsCodec: (codec: Codec) => boolean;
};

export type PlayerViewProps = ViewProps & {
	source: string | null;
	onPlaybackState?: (event: NativeSyntheticEvent<{ state: PlaybackState }>) => void;
	onPlaybackError?: (event: NativeSyntheticEvent<{ message: string }>) => void;
};

const nativeModule = requireNativeModule<NativeModule>("MoontvPlayer");

export const supportsCodec = (codec: Codec) => nativeModule.supportsCodec(codec);

export const PlayerView: ComponentType<PlayerViewProps> = requireNativeView("MoontvPlayer");
