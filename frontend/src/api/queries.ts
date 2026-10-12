import { useQuery } from "@tanstack/react-query";

import { fetchChannels, fetchProgram, fetchPrograms, fetchStatus } from "./client";

const CHANNELS_REFRESH_INTERVAL_MS = 30_000;

export const useStatus = () =>
	useQuery({ queryKey: ["status"], queryFn: fetchStatus, staleTime: Infinity });

export const useChannels = () =>
	useQuery({
		queryKey: ["channels"],
		queryFn: fetchChannels,
		refetchInterval: CHANNELS_REFRESH_INTERVAL_MS,
	});

export const usePrograms = (startMs: number, endMs: number) =>
	useQuery({
		queryKey: ["programs", startMs, endMs],
		queryFn: async () => await fetchPrograms(startMs, endMs),
	});

export const useProgram = (id: number) =>
	useQuery({ queryKey: ["program", id], queryFn: async () => await fetchProgram(id) });
