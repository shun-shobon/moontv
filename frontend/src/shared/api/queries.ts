import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchChannels, fetchStatus } from "./client";

const CHANNELS_REFRESH_INTERVAL_MS = 30_000;

export const statusQuery = queryOptions({
	queryKey: ["status"],
	queryFn: fetchStatus,
	staleTime: Infinity,
});

export const channelsQuery = queryOptions({
	queryKey: ["channels"],
	queryFn: fetchChannels,
	refetchInterval: CHANNELS_REFRESH_INTERVAL_MS,
});

export const useStatus = () => useQuery(statusQuery);

export const useChannels = () => useQuery(channelsQuery);
