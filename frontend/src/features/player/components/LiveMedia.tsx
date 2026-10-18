import { usePlayer } from "@videojs/react/live-video";
import type { HlsJsAdapter } from "@videojs/react/media/hlsjs-video";
import { HlsJsVideo } from "@videojs/react/media/hlsjs-video";
import { useEffect, useRef, useState } from "react";

import { useCaptionTimeline } from "../hooks/useCaptionTimeline";
import { autoplay, resume } from "../media/autoplay";
import { isCausedByFullscreenExit, liveEdgeSeekTarget } from "../services/playback";
import { CaptionOverlay } from "./CaptionOverlay";

type Props = {
	src: string;
	showCaption: boolean;
	onVideoChange: (video: HTMLVideoElement | null) => void;
};

export function LiveMedia({ src, showCaption, onVideoChange }: Props) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [element, setElement] = useState<HTMLVideoElement | null>(null);
	const [media, setMedia] = useState<HlsJsAdapter | null>(null);
	const timeline = useCaptionTimeline(media);
	const isFullscreen = usePlayer((state) => state.isFullscreen);
	const wasFullscreenRef = useRef(false);
	const fullscreenExitedAtRef = useRef(Number.NEGATIVE_INFINITY);

	useEffect(() => {
		setElement(videoRef.current);
		onVideoChange(videoRef.current);
		return () => {
			onVideoChange(null);
		};
	}, [onVideoChange]);

	useEffect(() => {
		const wasFullscreen = wasFullscreenRef.current;
		wasFullscreenRef.current = isFullscreen;
		const video = videoRef.current;
		if (isFullscreen || !wasFullscreen || video == null) {
			return;
		}
		fullscreenExitedAtRef.current = performance.now();
		if (video.paused) {
			resume(video);
		}
	}, [isFullscreen]);

	return (
		<>
			<HlsJsVideo
				ref={videoRef}
				mediaRef={setMedia}
				src={src}
				// iOS でも ID3 を JavaScript で受け取れるよう、ネイティブの HLS ではなく hls.js で再生する。
				source={{ src, preferPlayback: "mse" }}
				className="size-full object-contain"
				playsInline
				preload="auto"
				onLoadStart={(event) => {
					autoplay(event.currentTarget);
				}}
				onPlay={(event) => {
					const video = event.currentTarget;
					const target = liveEdgeSeekTarget(video.seekable, video.currentTime);
					if (target != null) {
						video.currentTime = target;
					}
				}}
				onPause={(event) => {
					if (isCausedByFullscreenExit(performance.now(), fullscreenExitedAtRef.current)) {
						resume(event.currentTarget);
					}
				}}
			/>
			<CaptionOverlay video={element} timeline={timeline} showCaption={showCaption} />
		</>
	);
}
