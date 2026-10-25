import type { Channel, Recording } from "@moontv/core/api/schemas";
import { formatDuration } from "@moontv/core/domain/duration";
import { formatMarks } from "@moontv/core/domain/program-marks";
import { formatDate, formatRange } from "@moontv/core/domain/time";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Button } from "../../../shared/components/Button";
import { SidePanel } from "../../../shared/components/SidePanel";
import { colors, text } from "../../../shared/theme";

type Props = {
	recording: Recording;
	channel: Channel | undefined;
	deletion: { isPending: boolean; failed: boolean };
	onPlay: () => void;
	onDelete: () => void;
	onClose: () => void;
};

export function RecordingDetail({
	recording,
	channel,
	deletion,
	onPlay,
	onDelete,
	onClose,
}: Props) {
	const { program, state, durationMs, error } = recording;
	// 録画は消すと戻せないので、1回目は確かめるだけにする。ボタンを差し替えるとフォーカスが外れるので、表示だけを変える。
	const [confirming, setConfirming] = useState(false);
	const ready = state === "ready";
	// 変換中のものは書き込みの途中なので消させない。
	const deletable = state !== "converting";

	return (
		<SidePanel
			actions={
				<>
					{ready && <Button label="再生する" onPress={onPlay} hasTVPreferredFocus />}
					{deletable && (
						<Button
							label={deletion.isPending ? "削除中…" : confirming ? "もう一度押すと削除" : "削除"}
							hasTVPreferredFocus={!ready}
							onPress={() => {
								if (deletion.isPending) {
									return;
								}
								if (confirming) {
									onDelete();
								} else {
									setConfirming(true);
								}
							}}
						/>
					)}
					<Button label="閉じる" onPress={onClose} hasTVPreferredFocus={!ready && !deletable} />
				</>
			}
		>
			<Text style={styles.channel}>
				{channel?.name ?? "不明なチャンネル"}　{formatDate(program.startAt)}{" "}
				{formatRange(program.startAt, program.duration)}
			</Text>
			<Text style={styles.title} numberOfLines={3}>
				{program.name}
			</Text>
			<Text style={styles.meta}>
				{[durationMs == null ? null : formatDuration(durationMs), formatMarks(program.marks)]
					.filter((item) => item != null && item !== "")
					.join("　")}
			</Text>
			{state === "converting" && (
				<Text style={styles.status}>変換中です。終わると再生できます</Text>
			)}
			{state === "failed" && (
				<Text style={styles.status}>変換に失敗しました{error == null ? "" : `（${error}）`}</Text>
			)}
			<Text style={styles.description} numberOfLines={8}>
				{program.description}
			</Text>
			{deletion.failed && <Text style={styles.status}>削除できませんでした</Text>}
		</SidePanel>
	);
}

const styles = StyleSheet.create({
	channel: { ...text.label, color: colors.fgMuted },
	title: { ...text.title, color: colors.fg },
	meta: { ...text.caption, color: colors.fgSubtle },
	status: { ...text.label, color: colors.fgAccent },
	description: { ...text.body, color: colors.fgSecondary, marginTop: 8 },
});
