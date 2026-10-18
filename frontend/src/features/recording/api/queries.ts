import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteRecording, fetchRecordings } from "./client";

/** 録画の終了や変換の完了はサーバー側で進むので、画面を開いている間は追いかける。 */
const RECORDINGS_REFRESH_INTERVAL_MS = 10_000;

export const recordingsQuery = queryOptions({
	queryKey: ["recordings"],
	queryFn: fetchRecordings,
	refetchInterval: RECORDINGS_REFRESH_INTERVAL_MS,
});

export const useRecordings = (enabled: boolean) => useQuery({ ...recordingsQuery, enabled });

export const useDeleteRecording = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteRecording,
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey: recordingsQuery.queryKey });
		},
	});
};
