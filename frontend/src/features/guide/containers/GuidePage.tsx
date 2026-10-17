import { useCallback, useState } from "react";

import { useChannels } from "../../../shared/api/queries";
import type { Program } from "../../../shared/api/schemas";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { DAY_MS, startOfBroadcastDay } from "../../../shared/domain/time";
import { useNow } from "../../../shared/hooks/useNow";
import { guidePath } from "../../../shared/services/routes";
import { usePrograms } from "../api/queries";
import { DayTabs } from "../components/DayTabs";
import { ProgramGrid } from "../components/ProgramGrid";
import { guideColumns, initialScrollTop, selectableDays } from "../services/guide-layout";
import { ProgramDetailDialog } from "./ProgramDetailDialog";

export function GuidePage({ dayStart }: { dayStart: number }) {
	const now = useNow();
	const today = startOfBroadcastDay(now);
	const dayEnd = dayStart + DAY_MS;
	const channels = useChannels();
	const programs = usePrograms(dayStart, dayEnd);
	const [selected, setSelected] = useState<Program | null>(null);
	// useNow は最大 15 秒遅れるので、日を切り替えた瞬間の時刻で位置を決める。
	const scrollToNow = useCallback(
		(el: HTMLDivElement | null) => {
			if (el != null) {
				el.scrollTop = initialScrollTop(dayStart, Date.now());
			}
		},
		[dayStart],
	);

	const channelList = channels.data ?? [];

	// 日付タブの切り替えで履歴が積み重ならないよう、今の履歴を置き換える。
	const selectDay = (day: number) => {
		navigation.navigate(guidePath(day), { history: "replace" });
	};

	return (
		<div className="flex h-(--page-height) flex-col">
			<DayTabs days={selectableDays(today)} current={dayStart} onSelect={selectDay} />
			{programs.isError || channels.isError ? (
				<StatusMessage>番組情報を取得できませんでした。</StatusMessage>
			) : programs.data == null || channels.data == null ? (
				<StatusMessage>読み込み中…</StatusMessage>
			) : programs.data.length === 0 ? (
				<StatusMessage>
					番組情報がありません。mirakc が EPG を取得するまでお待ちください。
				</StatusMessage>
			) : (
				<div ref={scrollToNow} className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
					<ProgramGrid
						channels={guideColumns(channels.data, programs.data)}
						programs={programs.data}
						dayStart={dayStart}
						dayEnd={dayEnd}
						now={now}
						onSelect={setSelected}
					/>
				</div>
			)}
			{selected != null && (
				<ProgramDetailDialog
					program={selected}
					channel={channelList.find((c) => c.id === selected.serviceId)}
					now={now}
					onClose={() => {
						setSelected(null);
					}}
				/>
			)}
		</div>
	);
}
