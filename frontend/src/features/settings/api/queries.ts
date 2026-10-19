import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchTuners } from "./client";

/** 配信の開始・終了や録画で使い方がすぐ変わるので、画面を開いている間は追いかける。 */
const TUNERS_REFRESH_INTERVAL_MS = 5000;

export const tunersQuery = queryOptions({
	queryKey: ["tuners"],
	queryFn: fetchTuners,
	refetchInterval: TUNERS_REFRESH_INTERVAL_MS,
});

export const useTuners = () => useQuery(tunersQuery);
