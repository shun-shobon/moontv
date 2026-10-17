import type { LiveTarget } from "../api/urls";

export type LivePhase =
	| { kind: "starting" }
	| { kind: "playing" }
	| { kind: "error"; message: string };

export const MEDIA_ERROR_PHASE: LivePhase = { kind: "error", message: "再生が中断されました" };

/** 再試行で同じ配信を作り直したとき、前回の状態を持ち越さないよう試行回数も含める。 */
export const sessionKey = (
	{ serviceId, codec, quality, audio }: Omit<LiveTarget, "viewerId">,
	attempt: number,
) => `${serviceId}/${codec}/${quality}/${audio}/${attempt}`;

export const startFailurePhase = (error: unknown): LivePhase => {
	const reason = error instanceof Error ? `（${error.message}）` : "";
	return { kind: "error", message: `配信を開始できませんでした${reason}` };
};
