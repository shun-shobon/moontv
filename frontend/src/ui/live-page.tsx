import { Suspense, lazy, useEffect, useState } from "react";

import { useChannels, useStatus } from "../api/queries";
import type { Codec, Status } from "../api/schemas";
import { formatRange } from "../domain/time";
import { browserSupports } from "../media/codec-support";
import type { Preferences } from "../media/preferences";
import { loadPreferences, savePreferences } from "../media/preferences";
import { ChannelList } from "./channel-list";
import { useNow } from "./use-now";

/** Video.js は 700 kB 近くあるので、プレイヤーを表示するときまで読み込まない。 */
const loadLivePlayer = async () => await import("./live-player");
const LivePlayer = lazy(async () => ({ default: (await loadLivePlayer()).LivePlayer }));

/** 自動選択では圧縮効率の高い HEVC を優先し、ブラウザーが再生できなければ H.264 にする。 */
const resolveCodec = (preference: Preferences["codec"], status: Status): Codec => {
	const playable = status.codecs.filter(browserSupports);
	if (preference !== "auto" && playable.includes(preference)) {
		return preference;
	}
	return playable[0] ?? "h264";
};

export function LivePage({ serviceId }: { serviceId: number | null }) {
	const status = useStatus();
	const channels = useChannels();
	const now = useNow();
	const [preferences, setPreferences] = useState(loadPreferences);

	// チャンネル一覧を見ている間に先読みし、選んだときの待ち時間を減らす。
	useEffect(() => {
		void loadLivePlayer();
	}, []);

	const updatePreferences = (next: Preferences) => {
		setPreferences(next);
		savePreferences(next);
	};

	if (status.isError || channels.isError) {
		return (
			<Message>
				サーバーに接続できません。moontv と mirakc が起動しているか確認してください。
			</Message>
		);
	}
	if (status.data == null || channels.data == null) {
		return <Message>読み込み中…</Message>;
	}

	if (serviceId == null) {
		return (
			<div className="mx-auto w-full max-w-7xl p-4">
				<ChannelList channels={channels.data} activeId={null} now={now} layout="grid" />
			</div>
		);
	}

	const channel = channels.data.find((c) => c.id === serviceId);
	const codec = resolveCodec(preferences.codec, status.data);
	const quality = status.data.qualities.includes(preferences.quality)
		? preferences.quality
		: "720p";
	const present = channel?.present;

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
					<div className="flex flex-col gap-1">
						<p className="text-sm text-zinc-400">{channel?.name ?? "不明なチャンネル"}</p>
						{present != null && (
							<>
								<h1 className="text-lg leading-snug font-semibold">{present.name}</h1>
								<p className="text-sm text-zinc-500 tabular-nums">
									{formatRange(present.startAt, present.duration)}
								</p>
								<p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-zinc-300">
									{present.description}
								</p>
							</>
						)}
					</div>
				</div>
			</section>
			<aside className="px-4 pb-4 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto lg:px-0 lg:pb-0">
				<ChannelList channels={channels.data} activeId={serviceId} now={now} layout="list" />
			</aside>
		</div>
	);
}

function Message({ children }: { children: string }) {
	return <p className="p-8 text-center text-sm text-zinc-400">{children}</p>;
}

function PlayerPlaceholder() {
	return (
		<div className="flex aspect-video w-full items-center justify-center bg-black text-sm text-zinc-400">
			プレイヤーを読み込んでいます…
		</div>
	);
}
