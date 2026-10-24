import { leaveLive } from "@moontv/core/api/client";
import type { LiveTarget } from "@moontv/core/api/urls";
import { useEffect } from "react";

/** 無視聴タイムアウトを待たずにセッションを止めさせるため、ページを閉じたときも視聴終了を伝える。 */
export const useLeaveOnPageHide = ({ serviceId, codec, quality, audio, viewerId }: LiveTarget) => {
	useEffect(() => {
		const onPageHide = () => {
			leaveLive({ serviceId, codec, quality, audio, viewerId });
		};
		window.addEventListener("pagehide", onPageHide);
		return () => {
			window.removeEventListener("pagehide", onPageHide);
		};
	}, [serviceId, codec, quality, audio, viewerId]);
};
