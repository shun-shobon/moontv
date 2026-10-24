import { useChannels } from "@moontv/core/api/queries";
import type { Channel } from "@moontv/core/api/schemas";
import { listedChannels } from "@moontv/core/services/channel-list";

import { StatusMessage } from "../../../shared/components/StatusMessage";
import { ChannelGrid } from "../components/ChannelGrid";

type Props = {
	focusId: number | null;
	onWatch: (channel: Channel) => void;
};

export function LiveTab({ focusId, onWatch }: Props) {
	const channels = useChannels();

	if (channels.isError) {
		return <StatusMessage>チャンネル一覧を読み込めませんでした</StatusMessage>;
	}
	if (channels.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}
	return (
		<ChannelGrid
			channels={listedChannels(channels.data, focusId)}
			focusId={focusId}
			onSelect={onWatch}
		/>
	);
}
