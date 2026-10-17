import { Hls } from "@videojs/hlsjs-video";
import type { HlsJsAdapter } from "@videojs/react/media/hlsjs-video";
import { useEffect, useState } from "react";

import { CaptionTimeline, parseCaptionTag } from "../services/captions";

type MetadataSamples = { samples: { pts: number; data: Uint8Array }[] };

/** 字幕は ID3 として映像のセグメントに入っているので、hls.js が読み出したものを時刻順に貯める。 */
export const useCaptionTimeline = (media: HlsJsAdapter | null) => {
	const [timeline] = useState(() => new CaptionTimeline());

	useEffect(() => {
		let engine: Hls | null = null;
		const onMetadata = (_event: unknown, { samples }: MetadataSamples) => {
			for (const sample of samples) {
				const state = parseCaptionTag(sample.data);
				if (state != null) {
					timeline.add(sample.pts, state);
				}
			}
		};
		// hls.js のインスタンスは読み込みを始めるときに作られ、ソースを変えると作り直される。
		const attach = () => {
			const next = media?.engine ?? null;
			if (next === engine) {
				return;
			}
			engine?.off(Hls.Events.FRAG_PARSING_METADATA, onMetadata);
			engine = next;
			engine?.on(Hls.Events.FRAG_PARSING_METADATA, onMetadata);
		};
		media?.addEventListener("loadstart", attach);
		attach();
		return () => {
			media?.removeEventListener("loadstart", attach);
			engine?.off(Hls.Events.FRAG_PARSING_METADATA, onMetadata);
		};
	}, [media, timeline]);

	return timeline;
};
