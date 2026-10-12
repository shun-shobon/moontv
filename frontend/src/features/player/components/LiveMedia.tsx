import { usePlayer } from "@videojs/react/live-video";
import { HlsVideo } from "@videojs/react/media/hls-video";
import { useEffect, useRef } from "react";

import { isCausedByFullscreenExit, liveEdgeSeekTarget } from "../services/playback";

const resume = (video: HTMLVideoElement) => {
	video.play().catch(() => {
		// 再生を拒否されても、一時停止中に表示する中央の再生ボタンから再開できる。
	});
};

/** 音声付きの自動再生を拒否されたら、ミュートして再生だけは始める。 */
const autoplay = (video: HTMLVideoElement) => {
	video.play().catch((error: unknown) => {
		if (error instanceof DOMException && error.name === "NotAllowedError") {
			video.muted = true;
			resume(video);
		}
	});
};

export function LiveMedia({ src }: { src: string }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const isFullscreen = usePlayer((state) => state.isFullscreen);
	const wasFullscreenRef = useRef(false);
	const fullscreenExitedAtRef = useRef(Number.NEGATIVE_INFINITY);

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
		<HlsVideo
			ref={videoRef}
			src={src}
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
	);
}
