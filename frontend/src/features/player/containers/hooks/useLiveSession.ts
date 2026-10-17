import { useCallback, useEffect, useRef, useState } from "react";

import { leaveLive, startLive } from "../../api/client";
import type { LiveTarget } from "../../api/urls";
import type { LivePhase } from "../../services/live-session";
import { MEDIA_ERROR_PHASE, sessionKey, startFailurePhase } from "../../services/live-session";

/**
 * 配信の起動完了を待ってから再生に進む。起動失敗の理由を画面に出すため。
 * 視聴をやめたときとページを閉じたときは視聴終了を伝え、サーバーがセッションを早く止められるようにする。
 */
export const useLiveSession = (target: LiveTarget, attempt: number) => {
	const { serviceId, codec, quality, audio, viewerId } = target;
	const key = sessionKey(target, attempt);
	const [state, setState] = useState<{ key: string; phase: LivePhase } | null>(null);
	const phase: LivePhase = state?.key === key ? state.phase : { kind: "starting" };
	const keyRef = useRef(key);

	useEffect(() => {
		const current: LiveTarget = { serviceId, codec, quality, audio, viewerId };
		const controller = new AbortController();
		keyRef.current = key;

		startLive(current, controller.signal)
			.then(() => {
				if (!controller.signal.aborted) {
					setState({ key, phase: { kind: "playing" } });
				}
			})
			.catch((error: unknown) => {
				if (!controller.signal.aborted) {
					setState({ key, phase: startFailurePhase(error) });
				}
			});

		const onPageHide = () => {
			leaveLive(current);
		};
		window.addEventListener("pagehide", onPageHide);

		return () => {
			controller.abort();
			window.removeEventListener("pagehide", onPageHide);
			leaveLive(current);
		};
	}, [key, serviceId, codec, quality, audio, viewerId]);

	// 参照を変えると、切り替え前のソースで起きたエラーを新しい配信のものとして拾い直してしまう。
	const reportMediaError = useCallback(() => {
		setState({ key: keyRef.current, phase: MEDIA_ERROR_PHASE });
	}, []);

	return { key, phase, reportMediaError };
};
