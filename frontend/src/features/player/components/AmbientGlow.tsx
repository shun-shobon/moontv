import { useEffect, useRef } from "react";

const FRAME_INTERVAL_MS = 250;
/** 場面転換で光がちらつかないよう、新しいフレームを少しずつ重ねて色を移す。 */
const BLEND_ALPHA = 0.4;

/** 映像の色をぼかしてプレイヤーの周囲に滲ませる。 */
export function AmbientGlow({ video }: { video: HTMLVideoElement | null }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		let handle: number | null = null;
		if (canvas != null && context != null) {
			context.clearRect(0, 0, canvas.width, canvas.height);
			if (video != null) {
				let lastDrawnAt = Number.NEGATIVE_INFINITY;
				const draw = (now: number) => {
					if (now - lastDrawnAt >= FRAME_INTERVAL_MS) {
						lastDrawnAt = now;
						context.globalAlpha = BLEND_ALPHA;
						context.drawImage(video, 0, 0, canvas.width, canvas.height);
					}
					handle = video.requestVideoFrameCallback(draw);
				};
				handle = video.requestVideoFrameCallback(draw);
			}
		}
		return () => {
			if (handle != null) {
				video?.cancelVideoFrameCallback(handle);
			}
		};
	}, [video]);

	return (
		<canvas
			ref={canvasRef}
			width={16}
			height={9}
			aria-hidden
			className="pointer-events-none absolute inset-x-0 top-0 h-[140%] w-full opacity-60 blur-3xl lg:h-full"
		/>
	);
}
