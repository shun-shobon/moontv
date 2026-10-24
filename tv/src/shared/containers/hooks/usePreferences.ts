import { DEFAULT_PLAYBACK_PREFERENCES } from "@moontv/core/domain/preferences";
import type { PlaybackPreferences } from "@moontv/core/domain/preferences";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { loadPreferences, savePreferences } from "../../media/preferences";

/** 設定ページとプレイヤーで同じ値を見るため、react-query のキャッシュに置く。 */
export const preferencesQuery = queryOptions({
	queryKey: ["preferences"],
	queryFn: loadPreferences,
	staleTime: Infinity,
});

export const usePreferences = () => {
	const queryClient = useQueryClient();
	const { data } = useQuery(preferencesQuery);
	const update = useCallback(
		(next: PlaybackPreferences) => {
			queryClient.setQueryData(preferencesQuery.queryKey, next);
			void savePreferences(next);
		},
		[queryClient],
	);
	return [data ?? DEFAULT_PLAYBACK_PREFERENCES, update] as const;
};
