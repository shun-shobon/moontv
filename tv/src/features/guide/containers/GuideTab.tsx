import { programsQuery, useChannels, useSchedules, useStatus } from "@moontv/core/api/queries";
import type { Program } from "@moontv/core/api/schemas";
import {
	DAY_MS,
	HOUR_MS,
	MINUTE_MS,
	formatTime,
	startOfBroadcastDay,
} from "@moontv/core/domain/time";
import { guideColumns, programEnd, selectableDays } from "@moontv/core/services/guide";
import { useQueries } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import type { HostInstance } from "react-native";
import { Pressable, StyleSheet, TVFocusGuideView, useTVEventHandler, View } from "react-native";

import { StatusMessage } from "../../../shared/components/StatusMessage";
import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { useNow } from "../../../shared/hooks/useNow";
import { remoteKeyRepeating } from "../../../shared/services/remote";
import { requestTVFocus } from "../../../shared/services/tv-focus";
import { GuideGrid } from "../components/GuideGrid";
import { COLUMN_WIDTH, TIME_COLUMN_WIDTH, toMs } from "../services/guide-layout";
import {
	moveInColumn,
	programAt,
	scrollColumnsToShow,
	scrollToShow,
} from "../services/guide-navigation";
import { ProgramDetailPanel } from "./ProgramDetailPanel";

/** 番組表を開いたとき、現在時刻のこれだけ前から見せる。 */
const SCROLL_LEAD_MS = 30 * MINUTE_MS;
/** 表示の前後もこれだけ読んでおき、送ったときに空の枠を見せない。 */
const PREFETCH_MS = 2 * HOUR_MS;
/** 番組情報の無い時間帯を選んだときの枠の長さ。 */
const EMPTY_SLOT_MS = 30 * MINUTE_MS;

export type GuidePosition = {
	column: number;
	time: number;
	viewStart: number;
	firstColumn: number;
};

type Props = {
	/** 視聴から戻ったときに同じ位置を開く。 */
	initialPosition: GuidePosition | null;
	onWatch: (serviceId: number, position: GuidePosition) => void;
	/** 戻るキーで、番組表からタブの列へフォーカスを移す。 */
	onBack: () => void;
};

const mergePrograms = (lists: readonly (readonly Program[] | undefined)[]) => {
	// 4時をまたぐ番組は前後の日の両方に入っている。
	const byId = new Map<number, Program>();
	for (const program of lists.flatMap((list) => list ?? [])) {
		byId.set(program.id, program);
	}
	const byService = new Map<number, Program[]>();
	const sorted = [...byId.values()];
	// Hermes には toSorted が無い。
	sorted.sort((a, b) => a.startAt - b.startAt);
	for (const program of sorted) {
		const list = byService.get(program.serviceId) ?? [];
		list.push(program);
		byService.set(program.serviceId, list);
	}
	return { programs: [...byId.values()], byService };
};

export function GuideTab({ initialPosition, onWatch, onBack }: Props) {
	const now = useNow();
	const today = startOfBroadcastDay(now);
	const range = useMemo(
		() => ({ start: today, end: today + selectableDays(today).length * DAY_MS }),
		[today],
	);
	const [position, setPosition] = useState<GuidePosition>(
		() =>
			initialPosition ?? {
				column: 0,
				time: now,
				viewStart: Math.max(today, now - SCROLL_LEAD_MS),
				firstColumn: 0,
			},
	);
	const [size, setSize] = useState({ visibleMs: 3 * HOUR_MS, visibleColumns: 5 });
	const [focused, setFocused] = useState(false);
	const [detail, setDetail] = useState<Program | null>(null);
	const rootRef = useRef<HostInstance>(null);

	const channels = useChannels();
	const schedules = useSchedules(useStatus().data?.recording ?? false);
	const scheduleStates = useMemo(
		() => new Map(schedules.data?.map((s) => [s.program.id, s.state])),
		[schedules.data],
	);
	const days = selectableDays(today).filter(
		(day) =>
			day < position.viewStart + size.visibleMs + PREFETCH_MS &&
			day + DAY_MS > position.viewStart - PREFETCH_MS,
	);
	const programLists = useQueries({
		queries: days.map((day) => programsQuery(day, day + DAY_MS)),
		combine: (results) => ({
			lists: results.map((result) => result.data),
			isError: results.some((result) => result.isError),
		}),
	});
	const { programs, byService } = useMemo(
		() => mergePrograms(programLists.lists),
		[programLists.lists],
	);
	const columns = useMemo(
		() => guideColumns(channels.data ?? [], programs),
		[channels.data, programs],
	);
	const column = Math.min(position.column, Math.max(0, columns.length - 1));
	const columnPrograms = byService.get(columns[column]?.id ?? -1) ?? [];
	const selected = programAt(columnPrograms, position.time);

	const moveVertical = (direction: 1 | -1) => {
		const time = moveInColumn(columnPrograms, position.time, direction, range);
		const target = programAt(columnPrograms, time);
		const viewStart = scrollToShow(
			position.viewStart,
			size.visibleMs,
			target == null
				? { start: time, end: time + EMPTY_SLOT_MS }
				: { start: target.startAt, end: programEnd(target) },
			range,
		);
		setPosition({ ...position, time: Math.max(time, viewStart), viewStart });
	};

	const moveHorizontal = (direction: 1 | -1) => {
		const next = Math.min(Math.max(column + direction, 0), columns.length - 1);
		setPosition({
			...position,
			column: next,
			firstColumn: scrollColumnsToShow(position.firstColumn, next, size.visibleColumns),
		});
	};

	useTVEventHandler((event) => {
		if (!focused || detail != null) {
			return;
		}
		const key = remoteKeyRepeating(event);
		if (key === "up" || key === "down") {
			moveVertical(key === "down" ? 1 : -1);
		} else if (key === "left" || key === "right") {
			moveHorizontal(key === "right" ? 1 : -1);
		}
	});
	useBackHandler(focused && detail == null ? onBack : null);

	if (channels.isError || programLists.isError) {
		return <StatusMessage>番組情報を取得できませんでした</StatusMessage>;
	}
	if (channels.data == null || programLists.lists.every((list) => list == null)) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}

	// 表の先頭では上へのフォーカス移動を許し、タブの列へ出られるようにする。
	const atTop =
		position.viewStart <= range.start && (selected?.startAt ?? position.time) <= range.start;

	return (
		<View style={styles.container}>
			<TVFocusGuideView
				style={styles.container}
				trapFocusUp={!atTop}
				trapFocusDown
				trapFocusLeft
				trapFocusRight
			>
				<Pressable
					ref={rootRef}
					hasTVPreferredFocus
					// 番組表は1つの要素なので、読み上げには表の文字を全部つなげず、選んでいる番組だけを伝える。
					accessibilityLabel={
						selected == null
							? `${columns[column]?.name ?? ""} 番組情報なし`
							: `${columns[column]?.name ?? ""} ${formatTime(selected.startAt)} ${selected.name}`
					}
					onFocus={() => {
						setFocused(true);
					}}
					onBlur={() => {
						setFocused(false);
					}}
					onPress={() => {
						if (selected != null) {
							setDetail(selected);
						}
					}}
					style={styles.container}
				>
					<GuideGrid
						columns={columns}
						programsByService={byService}
						scheduleStates={scheduleStates}
						firstColumn={position.firstColumn}
						visibleColumns={size.visibleColumns}
						viewStart={position.viewStart}
						visibleMs={size.visibleMs}
						selectedColumn={column}
						selectedProgramId={selected?.id ?? null}
						focused={focused || detail != null}
						now={now}
						onBodyLayout={(event) => {
							const { width, height } = event.nativeEvent.layout;
							setSize({
								visibleMs: toMs(height),
								visibleColumns: Math.max(1, Math.floor((width - TIME_COLUMN_WIDTH) / COLUMN_WIDTH)),
							});
						}}
					/>
				</Pressable>
			</TVFocusGuideView>
			{detail != null && (
				<ProgramDetailPanel
					program={detail}
					channel={channels.data.find((c) => c.id === detail.serviceId)}
					now={now}
					onWatch={() => {
						onWatch(detail.serviceId, position);
					}}
					onClose={() => {
						setDetail(null);
						requestTVFocus(rootRef.current);
					}}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
});
