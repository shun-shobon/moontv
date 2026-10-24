import "./index.css";
import { setServerUrl } from "@moontv/core/api/urls";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { App } from "./app/containers/App";
import type { Redirect, Screen } from "./app/containers/screens";
import { LOADING_SCREEN, loadScreen } from "./app/containers/screens";
import { interceptNavigations } from "./app/services/navigation";
import { createStore } from "./app/services/store";

setServerUrl(window.location.origin);

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
});

const screens = createStore(LOADING_SCREEN);

const show = (screen: Screen | Redirect) => {
	if ("redirect" in screen) {
		navigation.navigate(screen.redirect, { history: "replace" });
		return;
	}
	// 遷移の完了後にブラウザーがスクロール位置とフォーカスを戻すので、それまでに描画を終えておく。
	flushSync(() => {
		screens.set(screen);
	});
};

interceptNavigations(async (destination) => await loadScreen(destination, queryClient), show);

const root = document.querySelector("#root");
if (root == null) {
	throw new Error("Root element is missing.");
}

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App screens={screens} />
		</QueryClientProvider>
	</StrictMode>,
);

const initialEntry = navigation.currentEntry;
const initialScreen = await loadScreen(new URL(window.location.href), queryClient);
// 最初の画面の読み込み中に別の画面へ移っていたら、そちらの結果を残す。
if (navigation.currentEntry === initialEntry) {
	show(initialScreen);
}
