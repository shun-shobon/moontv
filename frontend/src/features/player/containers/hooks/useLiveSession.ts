import { useCallback, useEffect, useRef, useState } from "react";

import { fetchLiveEnd, leaveLive, startLive } from "../../api/client";
import type { LiveTarget } from "../../api/urls";
import type { LivePhase } from "../../services/live-session";
import { interruptedPhase, sessionKey, startFailurePhase } from "../../services/live-session";

/** 問い合わせに失敗しても、理由を添えずに中断を伝えれば足りる。 */
const fetchEndReason = async (target: LiveTarget) =>
	await fetchLiveEnd(target).then(
		({ reason }) => reason,
		() => null,
	);

export const useLiveSession = (target: LiveTarget, attempt: number) => {
	const { serviceId, codec, quality, audio, viewerId } = target;
	const key = sessionKey(target, attempt);
	const [state, setState] = useState<{ key: string; phase: LivePhase } | null>(null);
	const phase: LivePhase = state?.key === key ? state.phase : { kind: "starting" };
	const keyRef = useRef(key);
	const targetRef = useRef(target);

	useEffect(() => {
		const current: LiveTarget = { serviceId, codec, quality, audio, viewerId };
		const controller = new AbortController();
		keyRef.current = key;
		targetRef.current = current;

		startLive(current, controller.signal)
			.then(() => {
				if (!controller.signal.aborted) {
					setState({ key, phase: { kind: "playing" } });
				}
			})
			.catch(async (error: unknown) => {
				const reason = await fetchEndReason(current);
				if (!controller.signal.aborted) {
					setState({ key, phase: startFailurePhase(error, reason) });
				}
			});

		// 無視聴タイムアウトを待たずにセッションを止めさせるため、ページを閉じたときも視聴終了を伝える。
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
		const errorKey = keyRef.current;
		const report = (next: LivePhase) => {
			if (keyRef.current === errorKey) {
				setState({ key: errorKey, phase: next });
			}
		};
		void fetchEndReason(targetRef.current).then((reason) => {
			report(interruptedPhase(reason));
		});
	}, []);

	return { key, phase, reportMediaError };
};
