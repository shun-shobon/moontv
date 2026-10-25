import { useChannels, useSchedules, useStatus, usePrograms } from "@moontv/core/api/queries";
import type { Program } from "@moontv/core/api/schemas";
import { DAY_MS, startOfBroadcastDay } from "@moontv/core/domain/time";
import { guideColumns, selectableDays } from "@moontv/core/services/guide";
import { useCallback, useMemo, useState } from "react";

import { StatusMessage } from "../../../shared/components/StatusMessage";
import { useNow } from "../../../shared/hooks/useNow";
import { guidePath } from "../../../shared/services/routes";
import { DayTabs } from "../components/DayTabs";
import { ProgramGrid } from "../components/ProgramGrid";
import { initialScrollTop } from "../services/guide-layout";
import { ProgramDetailDialog } from "./ProgramDetailDialog";

export function GuidePage({ dayStart }: { dayStart: number }) {
	const now = useNow();
	const today = startOfBroadcastDay(now);
	const dayEnd = dayStart + DAY_MS;
	const channels = useChannels();
	const programs = usePrograms(dayStart, dayEnd);
	const schedules = useSchedules(useStatus().data?.recording ?? false);
	const scheduleStates = useMemo(
		() => new Map(schedules.data?.map((s) => [s.program.id, s.state])),
		[schedules.data],
	);
	// 閉じるアニメーションの間も中身を描くため、選んだ番組は閉じても残す。
	const [selected, setSelected] = useState<Program | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
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
						scheduleStates={scheduleStates}
						dayStart={dayStart}
						dayEnd={dayEnd}
						now={now}
						onSelect={(program) => {
							setSelected(program);
							setDialogOpen(true);
						}}
					/>
				</div>
			)}
			{selected != null && (
				<ProgramDetailDialog
					program={selected}
					channel={channelList.find((c) => c.id === selected.serviceId)}
					now={now}
					isOpen={dialogOpen}
					onOpenChange={setDialogOpen}
				/>
			)}
		</div>
	);
}
