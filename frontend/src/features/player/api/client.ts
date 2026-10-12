import { request } from "../../../shared/api/client";
import type { LiveTarget } from "./urls";
import { livePath } from "./urls";

/** チューナーの確保と最初のセグメント生成を待つ。失敗理由はサーバーのメッセージで返る。 */
export async function startLive(target: LiveTarget, signal: AbortSignal): Promise<void> {
	await request(livePath(target), { method: "PUT", signal });
}

/** ページを閉じる途中でも届くよう keepalive で送る。 */
export function leaveLive(target: LiveTarget): void {
	void fetch(livePath(target), { method: "DELETE", keepalive: true }).catch(() => {
		// 届かなくてもサーバー側が無視聴タイムアウトでセッションを止める。
	});
}
