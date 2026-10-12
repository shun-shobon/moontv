import { Suspense, lazy, useEffect } from "react";

import { useChannels, useStatus } from "../../api/queries";
import { browserSupports } from "../../media/codec-support";
import { ChannelList } from "../components/ChannelList";
import { NowPlaying } from "../components/NowPlaying";
import { PlayerPlaceholder } from "../components/PlayerPlaceholder";
import { StatusMessage } from "../components/StatusMessage";
import { useNow } from "../hooks/useNow";
import { resolveCodec, resolveQuality } from "../services/stream-selection";
import { usePreferences } from "./hooks/usePreferences";

/** Video.js は 700 kB 近くあるので、プレイヤーを表示するときまで読み込まない。 */
const loadLivePlayer = async () => await import("./LivePlayer");
const LivePlayer = lazy(async () => ({ default: (await loadLivePlayer()).LivePlayer }));

export function LivePage({ serviceId }: { serviceId: number | null }) {
	const status = useStatus();
	const channels = useChannels();
	const now = useNow();
	const [preferences, updatePreferences] = usePreferences();

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
				<ChannelList channels={channels.data} activeId={null} now={now} layout="grid" />
			</div>
		);
	}

	const codec = resolveCodec(preferences.codec, status.data, browserSupports);
	const quality = resolveQuality(preferences.quality, status.data);

	return (
		<div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-4">
			<section className="flex min-w-0 flex-col gap-4">
				<div className="lg:overflow-hidden lg:rounded-xl">
					<Suspense fallback={<PlayerPlaceholder />}>
						<LivePlayer
							serviceId={serviceId}
							codec={codec}
							quality={quality}
							settings={{
								qualities: status.data.qualities,
								codecs: status.data.codecs,
								activeCodec: codec,
								preferences,
								onChange: updatePreferences,
							}}
						/>
					</Suspense>
				</div>
				<div className="flex flex-col gap-4 px-4 lg:px-0">
					<NowPlaying channel={channels.data.find((c) => c.id === serviceId)} />
				</div>
			</section>
			<aside className="px-4 pb-4 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:px-0 lg:pb-0">
				<ChannelList channels={channels.data} activeId={serviceId} now={now} layout="list" />
			</aside>
		</div>
	);
}
