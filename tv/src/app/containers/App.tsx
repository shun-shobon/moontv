import { setServerUrl } from "@moontv/core/api/urls";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { AppState, StatusBar, StyleSheet, View } from "react-native";

import { WatchScreen } from "../../features/player/containers/WatchScreen";
import { SetupScreen } from "../../features/setup/containers/SetupScreen";
import { preferencesQuery } from "../../shared/containers/hooks/usePreferences";
import { loadServerUrl } from "../../shared/media/server-url";
import { colors } from "../../shared/theme";
import type { Tab } from "../components/TabBar";
import { HomeScreen } from "./HomeScreen";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000 } },
});

type Route =
	| { name: "setup" }
	| { name: "home"; tab: Tab; focusId: number | null }
	| { name: "watch"; serviceId: number };

export function App() {
	const [serverUrl, setServerUrlState] = useState<string | null | undefined>(undefined);
	const [route, setRoute] = useState<Route>({ name: "home", tab: "live", focusId: null });
	const active = useIsAppActive();

	useEffect(() => {
		// 視聴を始めてから設定が読み込まれると、画質やコーデックが変わって配信を作り直すことになる。
		queryClient.query(preferencesQuery).catch(() => undefined);
		void loadServerUrl().then((url) => {
			if (url != null) {
				setServerUrl(url);
			}
			setServerUrlState(url);
		});
	}, []);

	const exitWatch = useCallback(() => {
		setRoute((current) => ({
			name: "home",
			tab: "live",
			focusId: current.name === "watch" ? current.serviceId : null,
		}));
	}, []);

	const content = () => {
		if (serverUrl === undefined) {
			return null;
		}
		if (serverUrl == null || route.name === "setup") {
			return (
				<SetupScreen
					initialValue={serverUrl ?? ""}
					onConnected={(url) => {
						// 別のサーバーの番組やチャンネルを混ぜない。
						queryClient.clear();
						setServerUrlState(url);
						setRoute({ name: "home", tab: "live", focusId: null });
					}}
				/>
			);
		}
		if (route.name === "watch") {
			// バックグラウンドでは配信を止め、チューナーを空ける。戻ったら同じチャンネルを開き直す。
			return active ? (
				<WatchScreen
					serviceId={route.serviceId}
					onChangeChannel={(serviceId) => {
						setRoute({ name: "watch", serviceId });
					}}
					onExit={exitWatch}
				/>
			) : null;
		}
		return (
			<HomeScreen
				serverUrl={serverUrl}
				tab={route.tab}
				focusId={route.focusId}
				onSelectTab={(tab) => {
					setRoute({ name: "home", tab, focusId: null });
				}}
				onWatch={(serviceId) => {
					setRoute({ name: "watch", serviceId });
				}}
				onChangeServer={() => {
					setRoute({ name: "setup" });
				}}
			/>
		);
	};

	return (
		<QueryClientProvider client={queryClient}>
			<StatusBar hidden />
			<View style={styles.root}>{content()}</View>
		</QueryClientProvider>
	);
}

const useIsAppActive = () => {
	const [active, setActive] = useState(AppState.currentState === "active");
	useEffect(() => {
		const subscription = AppState.addEventListener("change", (state) => {
			setActive(state === "active");
		});
		return () => {
			subscription.remove();
		};
	}, []);
	return active;
};

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: colors.canvas },
});
