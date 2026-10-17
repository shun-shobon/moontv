import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import UniversalRouter from "universal-router";
import type { Routes } from "universal-router";

import { programsQuery } from "../../features/guide/api/queries";
import { resolveGuideDay } from "../../features/guide/services/guide-layout";
import { channelsQuery, statusQuery } from "../../shared/api/queries";
import { StatusMessage } from "../../shared/components/StatusMessage";
import { DAY_MS, startOfBroadcastDay } from "../../shared/domain/time";
import { guidePath, parseGuideDate, parseServiceId } from "../../shared/services/routes";
import type { Section } from "../components/AppHeader";
import { ErrorPage } from "../components/ErrorPage";
import { NotFoundPage } from "../components/NotFoundPage";

declare module "universal-router" {
	interface RouterContext {
		queryClient: QueryClient;
		searchParams: URLSearchParams;
	}
}

export type Screen = { section: Section | null; page: ReactNode };

/** URL を正しい形に置き換えて遷移し直す。 */
export type Redirect = { redirect: string };

export const LOADING_SCREEN: Screen = {
	section: null,
	page: <StatusMessage>読み込み中…</StatusMessage>,
};

const NOT_FOUND_SCREEN: Screen = { section: null, page: <NotFoundPage /> };

export const ERROR_PAGE = (
	<ErrorPage
		onReload={() => {
			window.location.reload();
		}}
	/>
);

const ERROR_SCREEN: Screen = { section: null, page: ERROR_PAGE };

/**
 * ページのコードと、描画に要るデータを並べて待つ。
 * キャッシュがあれば古くても待たずに使う。更新はページの useQuery が裏で行う。
 */
const loadLive = async (queryClient: QueryClient) => {
	const [{ LivePage }, , channels] = await Promise.all([
		import("../../features/live/containers/LivePage"),
		queryClient.query({ ...statusQuery, staleTime: "static" }),
		queryClient.query({ ...channelsQuery, staleTime: "static" }),
	]);
	return { LivePage, channels };
};

// action が null を返すと、universal-router は次のルートを探し、なければ 404 として errorHandler に渡す。
const routes: Routes<Screen | Redirect> = [
	{
		path: "/",
		action: async ({ queryClient }) => {
			const { LivePage } = await loadLive(queryClient);
			return { section: "live", page: <LivePage serviceId={null} /> };
		},
	},
	{
		path: "/watch/:serviceId",
		action: async ({ queryClient }, params) => {
			const serviceId = parseServiceId(params["serviceId"]);
			if (serviceId == null) {
				return null;
			}
			const { LivePage, channels } = await loadLive(queryClient);
			if (!channels.some((c) => c.id === serviceId)) {
				return null;
			}
			return { section: "live", page: <LivePage serviceId={serviceId} /> };
		},
	},
	{
		path: "/guide",
		action: async ({ queryClient, searchParams }) => {
			const requested = searchParams.get("date");
			const requestedDay = parseGuideDate(requested);
			const dayStart = resolveGuideDay(requestedDay, startOfBroadcastDay(Date.now()));
			if (requested != null && requestedDay !== dayStart) {
				return { redirect: guidePath(dayStart) };
			}
			const [{ GuidePage }] = await Promise.all([
				import("../../features/guide/containers/GuidePage"),
				queryClient.query({ ...channelsQuery, staleTime: "static" }),
				queryClient.query({ ...programsQuery(dayStart, dayStart + DAY_MS), staleTime: "static" }),
			]);
			return { section: "guide", page: <GuidePage dayStart={dayStart} /> };
		},
	},
];

const router = new UniversalRouter<Screen | Redirect>(routes, {
	errorHandler: (error) => {
		if (error.status === 404) {
			return NOT_FOUND_SCREEN;
		}
		console.error(error);
		return ERROR_SCREEN;
	},
});

/** 遷移先の画面を、表示に要るものを読み込み終えた状態で返す。失敗はエラー画面として返す。 */
export const loadScreen = async (
	destination: URL,
	queryClient: QueryClient,
): Promise<Screen | Redirect> =>
	(await router.resolve({
		pathname: destination.pathname,
		queryClient,
		searchParams: destination.searchParams,
	})) ?? NOT_FOUND_SCREEN;
