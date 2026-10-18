import type { HlsJsAdapter } from "@videojs/react/media/hlsjs-video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { useEffect, useRef, useState } from "react";

import { useCaptionTimeline } from "../hooks/useCaptionTimeline";
import { useResumeBufferingOnSeek } from "../hooks/useResumeBufferingOnSeek";
import { autoplay } from "../media/autoplay";
import { CaptionOverlay } from "./CaptionOverlay";

type Props = {
	src: string;
	showCaption: boolean;
	onVideoChange: (video: HTMLVideoElement | null) => void;
};

export function RecordingMedia({ src, showCaption, onVideoChange }: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [element, setElement] = useState<HTMLVideoElement | null>(null);
	const [media, setMedia] = useState<HlsJsAdapter | null>(null);
	const timeline = useCaptionTimeline(media);
	useResumeBufferingOnSeek(media);

	useEffect(() => {
		setElement(videoRef.current);
		onVideoChange(videoRef.current);
		return () => {
			onVideoChange(null);
		};
	}, [onVideoChange]);

	return (
		<>
			<HlsJsVideo
				ref={videoRef}
				mediaRef={setMedia}
				src={src}
				// 字幕の ID3 を JavaScript で受け取るため、ネイティブの HLS ではなく hls.js で再生する。
				source={{ src, preferPlayback: "mse" }}
				className="size-full object-contain"
				playsInline
				preload="auto"
				onLoadStart={(event) => {
					autoplay(event.currentTarget);
				}}
			/>
			<CaptionOverlay video={element} timeline={timeline} showCaption={showCaption} />
		</>
	);
}
