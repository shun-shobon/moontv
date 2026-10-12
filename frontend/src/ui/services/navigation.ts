type NavigationTarget = {
	canIntercept: boolean;
	hashChange: boolean;
	downloadRequest: string | null;
	destination: URL;
};

/** 同一オリジンのページ遷移だけを横取りする。API とファイル取得はブラウザーに任せる。 */
export const shouldIntercept = (target: NavigationTarget, origin: string) =>
	target.canIntercept &&
	!target.hashChange &&
	target.downloadRequest == null &&
	target.destination.origin === origin &&
	!target.destination.pathname.startsWith("/api/");

/** リロードせずに描画を切り替える。描画は currententrychange を購読する useRoute が行う。 */
export const interceptNavigations = () => {
	navigation.addEventListener("navigate", (event) => {
		const target = {
			canIntercept: event.canIntercept,
			hashChange: event.hashChange,
			downloadRequest: event.downloadRequest,
			destination: new URL(event.destination.url),
		};
		if (!shouldIntercept(target, window.location.origin)) {
			return;
		}
		event.intercept({
			handler: async () => {
				// 描画は useRoute が行うので、ここで待つものはない。
			},
		});
	});
};
