import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
	addSchedule,
	deleteRecording,
	fetchChannels,
	fetchProgram,
	fetchPrograms,
	fetchRecording,
	fetchRecordings,
	fetchSchedules,
	fetchStatus,
	fetchTuners,
	removeSchedule,
} from "./client";

const CHANNELS_REFRESH_INTERVAL_MS = 30_000;
/** 録画の開始・終了は mirakc が決めるので、画面を開いている間は追いかける。 */
const SCHEDULES_REFRESH_INTERVAL_MS = 30_000;
/** 録画の終了や変換の完了はサーバー側で進むので、画面を開いている間は追いかける。 */
const RECORDINGS_REFRESH_INTERVAL_MS = 10_000;
/** 配信の開始・終了や録画で使い方がすぐ変わるので、画面を開いている間は追いかける。 */
const TUNERS_REFRESH_INTERVAL_MS = 5000;

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

export const tunersQuery = queryOptions({
	queryKey: ["tuners"],
	queryFn: fetchTuners,
	refetchInterval: TUNERS_REFRESH_INTERVAL_MS,
});

export const programsQuery = (startMs: number, endMs: number) =>
	queryOptions({
		queryKey: ["programs", startMs, endMs],
		queryFn: async () => await fetchPrograms(startMs, endMs),
	});

export const schedulesQuery = queryOptions({
	queryKey: ["schedules"],
	queryFn: fetchSchedules,
	refetchInterval: SCHEDULES_REFRESH_INTERVAL_MS,
});

export const recordingsQuery = queryOptions({
	queryKey: ["recordings"],
	queryFn: fetchRecordings,
	refetchInterval: RECORDINGS_REFRESH_INTERVAL_MS,
});

export const recordingQuery = (programId: number) =>
	queryOptions({
		queryKey: ["recordings", programId],
		queryFn: async () => await fetchRecording(programId),
	});

export const useStatus = () => useQuery(statusQuery);

export const useChannels = () => useQuery(channelsQuery);

export const useTuners = () => useQuery(tunersQuery);

export const usePrograms = (startMs: number, endMs: number) =>
	useQuery(programsQuery(startMs, endMs));

export const useProgram = (id: number) =>
	useQuery({ queryKey: ["program", id], queryFn: async () => await fetchProgram(id) });

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

export const useRecording = (programId: number) => useQuery(recordingQuery(programId));

export const useRecordings = (enabled: boolean) => useQuery({ ...recordingsQuery, enabled });

export const useDeleteRecording = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteRecording,
		onSuccess: (_data, programId) => {
			// 消した録画を開いている画面が、取り直して 404 を表示しないようにする。
			queryClient.removeQueries({ queryKey: recordingQuery(programId).queryKey });
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey: recordingsQuery.queryKey, exact: true });
		},
	});
};
