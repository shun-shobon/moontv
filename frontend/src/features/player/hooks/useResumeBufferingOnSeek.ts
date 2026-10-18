import type { HlsJsAdapter } from "@videojs/react/media/hlsjs-video";
import { useEffect } from "react";

/**
 * iPhone の ManagedMediaSource は、十分に読み込むと endstreaming で hls.js の読み込みを止めさせる。
 * 読み込んでいない位置へシークしても startstreaming が来ないことがあり、そのままでは読み込みが再開されず固まる。
 * シークしたときとデータを待って止まったときは、ブラウザーの合図を待たずに読み込みを再開させる。
 */
export const useResumeBufferingOnSeek = (media: HlsJsAdapter | null) => {
	useEffect(() => {
		const resume = () => {
			media?.engine?.resumeBuffering();
		};
		media?.addEventListener("seeking", resume);
		media?.addEventListener("waiting", resume);
		return () => {
			media?.removeEventListener("seeking", resume);
			media?.removeEventListener("waiting", resume);
		};
	}, [media]);
};
