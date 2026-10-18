export const resume = (video: HTMLVideoElement) => {
	video.play().catch(() => {
		// 再生を拒否されても、一時停止中に表示する中央の再生ボタンから再開できる。
	});
};

/** 音声付きの自動再生を拒まれたら、消音して再生し直す。 */
export const autoplay = (video: HTMLVideoElement) => {
	video.play().catch((error: unknown) => {
		if (error instanceof DOMException && error.name === "NotAllowedError") {
			video.muted = true;
			resume(video);
		}
	});
};
