import { useChannels, useStatus } from "@moontv/core/api/queries";
import { listedChannels } from "@moontv/core/services/channel-list";
import { StyleSheet, View } from "react-native";

import { StatusMessage } from "../../../shared/components/StatusMessage";
import { useBackHandler } from "../../../shared/hooks/useBackHandler";
import { colors } from "../../../shared/theme";
import { LivePlayer } from "./LivePlayer";

type Props = {
	serviceId: number;
	onChangeChannel: (serviceId: number) => void;
	onExit: () => void;
};

export function WatchScreen({ serviceId, onChangeChannel, onExit }: Props) {
	const status = useStatus();
	const channels = useChannels();
	const listed = channels.data == null ? [] : listedChannels(channels.data, serviceId);
	const index = listed.findIndex((c) => c.id === serviceId);
	const channel = listed[index];
	// 再生中の戻るキーは、メニューを閉じるかを決める LivePlayer が受ける。
	useBackHandler(status.data == null || channel == null ? onExit : null);

	return (
		<View style={styles.container}>
			{status.data == null || channel == null ? (
				<StatusMessage>
					{status.isError || channels.isError ? "サーバーに接続できません" : "読み込み中…"}
				</StatusMessage>
			) : (
				<LivePlayer
					channel={channel}
					status={status.data}
					onExit={onExit}
					onZap={(direction) => {
						const next = listed[(index + direction + listed.length) % listed.length];
						if (next != null) {
							onChangeChannel(next.id);
						}
					}}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.video },
});
