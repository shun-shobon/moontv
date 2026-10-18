import { Suspense, lazy, useEffect } from "react";

import { useChannels, useStatus } from "../../../shared/api/queries";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { WatchLayout } from "../../../shared/components/WatchLayout";
import { PlayerPlaceholder } from "../../player/components/PlayerPlaceholder";
import { ChannelList } from "../components/ChannelList";
import { NowPlaying } from "../components/NowPlaying";
import { nowPlayingOf } from "../services/now-playing";

/** Video.js は 700 kB 近くあるので、プレイヤーを表示するときまで読み込まない。 */
const loadLivePlayer = async () => await import("../../player/containers/LivePlayer");
const LivePlayer = lazy(async () => ({ default: (await loadLivePlayer()).LivePlayer }));

export function LivePage({ serviceId }: { serviceId: number | null }) {
	const status = useStatus();
	const channels = useChannels();

	// チャンネル一覧を見ている間に先読みし、選んだときの待ち時間を減らす。
	useEffect(() => {
		void loadLivePlayer();
	}, []);

	if (status.isError || channels.isError) {
		return (
			<StatusMessage>
				サーバーに接続できません。moontv と mirakc が起動しているか確認してください。
			</StatusMessage>
		);
	}
	if (status.data == null || channels.data == null) {
		return <StatusMessage>読み込み中…</StatusMessage>;
	}

	if (serviceId == null) {
		return (
			<div className="mx-auto w-full max-w-7xl p-4">
				<ChannelList channels={channels.data} activeId={null} layout="grid" />
			</div>
		);
	}

	const channel = channels.data.find((c) => c.id === serviceId);

	return (
		<WatchLayout
			player={
				<Suspense fallback={<PlayerPlaceholder />}>
					<LivePlayer
						serviceId={serviceId}
						status={status.data}
						nowPlaying={channel && nowPlayingOf(channel)}
						audios={channel?.present?.audios ?? []}
					/>
				</Suspense>
			}
			info={<NowPlaying channel={channel} />}
			aside={<ChannelList channels={channels.data} activeId={serviceId} layout="list" />}
		/>
	);
}
