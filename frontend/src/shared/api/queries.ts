import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addSchedule, fetchChannels, fetchSchedules, fetchStatus, removeSchedule } from "./client";

const CHANNELS_REFRESH_INTERVAL_MS = 30_000;
/** 録画の開始・終了は mirakc が決めるので、画面を開いている間は追いかける。 */
const SCHEDULES_REFRESH_INTERVAL_MS = 30_000;

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

export const schedulesQuery = queryOptions({
	queryKey: ["schedules"],
	queryFn: fetchSchedules,
	refetchInterval: SCHEDULES_REFRESH_INTERVAL_MS,
});

export const useStatus = () => useQuery(statusQuery);

export const useChannels = () => useQuery(channelsQuery);

export const useSchedules = (enabled: boolean) => useQuery({ ...schedulesQuery, enabled });

export const useScheduleMutation = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ programId, scheduled }: { programId: number; scheduled: boolean }) => {
			await (scheduled ? addSchedule(programId) : removeSchedule(programId));
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey: schedulesQuery.queryKey });
		},
	});
};
