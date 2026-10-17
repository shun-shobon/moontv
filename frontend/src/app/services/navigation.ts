type NavigationTarget = {
	canIntercept: boolean;
	navigationType: NavigationType;
	hashChange: boolean;
	downloadRequest: string | null;
	destination: URL;
};

/**
 * 同一オリジンのページ遷移だけを横取りする。API とファイル取得はブラウザーに任せる。
 * 再読み込みも横取りしない。古いチャンクを読めなくなったときに、ページごと読み直して直すため。
 */
export const shouldIntercept = (target: NavigationTarget, origin: string) =>
	target.canIntercept &&
	target.navigationType !== "reload" &&
	!target.hashChange &&
	target.downloadRequest == null &&
	target.destination.origin === origin &&
	!target.destination.pathname.startsWith("/api/");

/** パスが同じなら、番組表の日付のようにページ内の状態を変える遷移として扱う。 */
export const isInPageChange = (from: URL, to: URL) => from.pathname === to.pathname;

/**
 * リロードせずに描画を切り替える。遷移先の準備が済むまで前の画面を残す。
 * 準備中に次の遷移が始まったら、古い遷移の結果は捨てる。
 */
export const interceptNavigations = <T>(
	prepare: (destination: URL) => Promise<T>,
	show: (prepared: T) => void,
) => {
	navigation.addEventListener("navigate", (event) => {
		const target = {
			canIntercept: event.canIntercept,
			navigationType: event.navigationType,
			hashChange: event.hashChange,
			downloadRequest: event.downloadRequest,
			destination: new URL(event.destination.url),
		};
		if (!shouldIntercept(target, window.location.origin)) {
			return;
		}
		const from = new URL(navigation.currentEntry?.url ?? window.location.href);
		event.intercept({
			// ページ内の切り替えでは、操作中の部品からフォーカスを外さず、スクロールも戻さない。
			...(isInPageChange(from, target.destination)
				? { focusReset: "manual", scroll: "manual" }
				: {}),
			handler: async () => {
				const prepared = await prepare(target.destination);
				if (!event.signal.aborted) {
					show(prepared);
				}
			},
		});
	});
};
