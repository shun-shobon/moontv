import { useQuery } from "@tanstack/react-query";

import { fetchChannels, fetchStatus } from "./client";

const CHANNELS_REFRESH_INTERVAL_MS = 30_000;

export const useStatus = () =>
	useQuery({ queryKey: ["status"], queryFn: fetchStatus, staleTime: Infinity });

export const useChannels = () =>
	useQuery({
		queryKey: ["channels"],
		queryFn: fetchChannels,
		refetchInterval: CHANNELS_REFRESH_INTERVAL_MS,
	});
