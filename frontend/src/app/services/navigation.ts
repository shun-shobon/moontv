type NavigationTarget = {
	canIntercept: boolean;
	navigationType: NavigationType;
	hashChange: boolean;
	downloadRequest: string | null;
	destination: URL;
};

/** 再読み込みは横取りしない。古いチャンクを読めなくなったときに、ページごと読み直して直すため。 */
export const shouldIntercept = (target: NavigationTarget, origin: string) =>
	target.canIntercept &&
	target.navigationType !== "reload" &&
	!target.hashChange &&
	target.downloadRequest == null &&
	target.destination.origin === origin &&
	!target.destination.pathname.startsWith("/api/");

export const isInPageChange = (from: URL, to: URL) => from.pathname === to.pathname;

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
