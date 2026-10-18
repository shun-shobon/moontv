import { useEffect, useRef } from "react";

import { BitmapCache, drawSnapshot } from "../media/caption-canvas";
import { loadCaptionFonts } from "../media/caption-fonts";
import { containedRect, isFlashHidden } from "../services/caption-layout";
import type { CaptionState, CaptionTimeline } from "../services/captions";

type Props = {
	/** 再生位置と映像の大きさだけを読む。 */
	video: Pick<HTMLVideoElement, "currentTime" | "videoWidth" | "videoHeight"> | null;
	timeline: CaptionTimeline;
	/** 字幕を出すか。文字スーパー（速報など）は常に出す。 */
	showCaption: boolean;
};

const textOf = (state: CaptionState) =>
	[state.caption, state.superimpose].flatMap((s) => s.runs.map((run) => run.text)).join("");

const hasFlash = (state: CaptionState | null) =>
	state != null && [state.caption, state.superimpose].some((s) => s.runs.some((run) => run.flash));

/** 再生位置の字幕と文字スーパーを、映像の表示範囲に重ねて描く。 */
export function CaptionOverlay({ video, timeline, showCaption }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		const bitmaps = new BitmapCache();
		let drawn = "";
		let handle: number | null = null;
		const draw = (now: number) => {
			handle = requestAnimationFrame(draw);
			if (canvas == null || context == null || video == null) {
				return;
			}
			const pixelRatio = window.devicePixelRatio;
			const width = Math.round(canvas.clientWidth * pixelRatio);
			const height = Math.round(canvas.clientHeight * pixelRatio);
			const state = timeline.at(video.currentTime);
			const key = [
				state?.seq,
				width,
				height,
				video.videoWidth,
				video.videoHeight,
				hasFlash(state) && isFlashHidden(now),
			].join();
			if (key === drawn) {
				return;
			}
			drawn = key;
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			context.clearRect(0, 0, width, height);
			if (state == null) {
				return;
			}
			// 読み込み中は代わりの書体で描いておき、読み終えたら描き直す。失敗したら代わりの書体のままにする。
			void loadCaptionFonts(textOf(state))?.then(
				() => {
					drawn = "";
				},
				() => undefined,
			);
			const rect = containedRect(
				{ width: canvas.clientWidth, height: canvas.clientHeight },
				{ width: video.videoWidth, height: video.videoHeight },
			);
			if (showCaption) {
				drawSnapshot(context, state.caption, rect, pixelRatio, now, bitmaps);
			}
			// 重なったら文字スーパーを手前に出す（TR-B14 第3巻 4.9）。
			drawSnapshot(context, state.superimpose, rect, pixelRatio, now, bitmaps);
		};
		if (video != null) {
			handle = requestAnimationFrame(draw);
		}
		return () => {
			if (handle != null) {
				cancelAnimationFrame(handle);
			}
		};
	}, [video, timeline, showCaption]);

	return (
		<canvas
			ref={canvasRef}
			aria-hidden
			className="pointer-events-none absolute inset-0 size-full"
		/>
	);
}
