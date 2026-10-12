import { useSyncExternalStore } from "react";
import UniversalRouterSync from "universal-router/sync";
import * as v from "valibot";

export type Route = { name: "home" } | { name: "watch"; serviceId: number } | { name: "guide" };

const ServiceIdSchema = v.pipe(v.string(), v.digits(), v.transform(Number));

const HOME: Route = { name: "home" };

const router = new UniversalRouterSync<Route>(
	[
		{ path: "/", action: () => HOME },
		{ path: "/guide", action: () => ({ name: "guide" }) },
		{
			path: "/watch/:serviceId",
			action: (_, params) => {
				const parsed = v.safeParse(ServiceIdSchema, params["serviceId"]);
				return parsed.success ? { name: "watch", serviceId: parsed.output } : HOME;
			},
		},
	],
	{ errorHandler: () => HOME },
);

/** 同一オリジンのページ遷移を横取りし、リロードせずに描画を切り替える。API とファイル取得は対象外。 */
export const interceptNavigations = () => {
	navigation.addEventListener("navigate", (event) => {
		const url = new URL(event.destination.url);
		const isAppPage = url.origin === window.location.origin && !url.pathname.startsWith("/api/");
		if (!event.canIntercept || event.hashChange || event.downloadRequest != null || !isAppPage) {
			return;
		}
		event.intercept({
			handler: async () => {
				// 描画は currententrychange を購読する useRoute が行うので、ここで待つものはない。
			},
		});
	});
};

const subscribe = (onChange: () => void) => {
	navigation.addEventListener("currententrychange", onChange);
	return () => {
		navigation.removeEventListener("currententrychange", onChange);
	};
};

const getPath = () => new URL(navigation.currentEntry?.url ?? window.location.href).pathname;

export const useRoute = (): Route =>
	router.resolve(useSyncExternalStore(subscribe, getPath)) ?? HOME;

export const watchPath = (serviceId: number) => `/watch/${serviceId}`;
