import type { EndReason } from "../api/schemas";
import type { LiveTarget } from "../api/urls";

export type LivePhase =
	| { kind: "starting" }
	| { kind: "playing" }
	| { kind: "error"; message: string };

const INTERRUPTED_MESSAGES: Record<EndReason, string> = {
	evicted: "チューナーが足りないため、別のチャンネルの視聴に譲りました",
	recording: "録画が始まったため、視聴を止めました",
};

export const interruptedPhase = (reason: EndReason | null): LivePhase => ({
	kind: "error",
	message: reason == null ? "再生が中断されました" : INTERRUPTED_MESSAGES[reason],
});

/** 再試行で同じ配信を作り直したとき、前回の状態を持ち越さないよう試行回数も含める。 */
export const sessionKey = (
	{ serviceId, codec, quality, audio }: Omit<LiveTarget, "viewerId">,
	attempt: number,
) => `${serviceId}/${codec}/${quality}/${audio}/${attempt}`;

export const startFailurePhase = (error: unknown, reason: EndReason | null): LivePhase => {
	if (reason === "recording") {
		return { kind: "error", message: "録画中のため、チューナーが空いていません" };
	}
	const detail = error instanceof Error ? `（${error.message}）` : "";
	return { kind: "error", message: `配信を開始できませんでした${detail}` };
};
