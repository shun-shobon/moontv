import "video.js/dist/video-js.css";
import "./live-player.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import videojs from "video.js";
import ja from "video.js/dist/lang/ja.json";

import type { LiveTarget } from "../api/client";
import { leaveLive, masterPlaylistUrl, startLive } from "../api/client";
import type { Codec, Quality } from "../api/schemas";
import { createViewerId } from "../media/viewer-id";
import type { StreamSettingsProps } from "./player-settings";
import { PlayerSettings } from "./player-settings";

type Player = ReturnType<typeof videojs>;

videojs.addLanguage("ja", ja);

/** iOS は全画面を閉じた直後に動画を一時停止するが、その pause は fullscreenchange より後に届くことがある。 */
const FULLSCREEN_EXIT_RESUME_WINDOW_MS = 2_000;

/**
 * 一時停止中にライブの最新位置から遅れた分を、再生再開時に取り戻す。
 * seekable の終端は再生可能な最新位置で、通常の再生でも 2〜3 秒後ろを再生しているため、それを超えた遅れだけを対象にする。
 */
const LIVE_EDGE_TOLERANCE_SECONDS = 3;

const seekToLiveEdgeIfBehind = (player: Player) => {
	// Video.js の seekable() は any 型なので、型の付いた video 要素から取る。
	const video = player.el().querySelector("video");
	if (video == null || video.seekable.length === 0) {
		return;
	}
	const liveEdge = video.seekable.end(video.seekable.length - 1);
	if (liveEdge - video.currentTime > LIVE_EDGE_TOLERANCE_SECONDS) {
		video.currentTime = liveEdge;
	}
};

const resume = (player: Player) => {
	player.play()?.catch(() => {
		// 再生を拒否されても、一時停止中に表示する中央の再生ボタンから再開できる。
	});
};

type Phase = { kind: "starting" } | { kind: "playing" } | { kind: "error"; message: string };

type Props = {
	serviceId: number;
	codec: Codec;
	quality: Quality;
	settings: StreamSettingsProps;
};

/** 再読み込みはプレイヤーごと作り直し、壊れた再生状態を持ち越さない。 */
export function LivePlayer(props: Props) {
	const [attempt, setAttempt] = useState(0);

	return (
		<PlayerView
			key={attempt}
			{...props}
			onRetry={() => {
				setAttempt((n) => n + 1);
			}}
		/>
	);
}

function PlayerView({
	serviceId,
	codec,
	quality,
	settings,
	onRetry,
}: Props & { onRetry: () => void }) {
	const playerRef = useRef<Player | null>(null);
	const [settingsHost, setSettingsHost] = useState<Element | null>(null);
	const [viewerId] = useState(createViewerId);
	const sourceKey = `${serviceId}/${codec}/${quality}`;
	const sourceKeyRef = useRef(sourceKey);
	const [phase, setPhase] = useState<{ sourceKey: string; phase: Phase } | null>(null);
	const current: Phase = phase?.sourceKey === sourceKey ? phase.phase : { kind: "starting" };

	// Video.js は渡した要素を自前の DOM で置き換えるため、React の管理外で生成する。
	const attachPlayer = useCallback((container: HTMLDivElement) => {
		const element = document.createElement("video-js");
		element.classList.add("vjs-big-play-centered");
		container.append(element);

		const player = videojs(element, {
			controls: true,
			autoplay: "any",
			fill: true,
			liveui: true,
			playsinline: true,
			preload: "auto",
			language: "ja",
			// ライブ視聴なので一時停止はさせない。誤タップで止まらないよう映像クリックも無効にする。
			userActions: { click: false },
			controlBar: { playToggle: false },
		});

		const controlBar = player.getChild("ControlBar");
		if (controlBar != null) {
			const fullscreen = controlBar.getChild("FullscreenToggle");
			const index = fullscreen == null ? undefined : controlBar.children().indexOf(fullscreen);
			const host = controlBar.addChild("Component", {}, index);
			host.addClass("h-full");
			setSettingsHost(host.el());
		}
		let fullscreenExitedAt = Number.NEGATIVE_INFINITY;
		player.on("fullscreenchange", () => {
			if (player.isFullscreen() ?? false) {
				return;
			}
			fullscreenExitedAt = performance.now();
			if (player.paused()) {
				resume(player);
			}
		});
		player.on("pause", () => {
			if (performance.now() - fullscreenExitedAt < FULLSCREEN_EXIT_RESUME_WINDOW_MS) {
				resume(player);
			}
		});
		player.on("play", () => {
			seekToLiveEdgeIfBehind(player);
		});
		player.on("error", () => {
			setPhase({
				sourceKey: sourceKeyRef.current,
				phase: { kind: "error", message: "再生が中断されました" },
			});
		});
		playerRef.current = player;

		return () => {
			setSettingsHost(null);
			player.dispose();
			playerRef.current = null;
		};
	}, []);

	useEffect(() => {
		const target: LiveTarget = { serviceId, codec, quality, viewerId };
		const key = `${serviceId}/${codec}/${quality}`;
		const controller = new AbortController();
		sourceKeyRef.current = key;
		playerRef.current?.pause();

		startLive(target, controller.signal)
			.then(() => {
				const player = playerRef.current;
				if (player == null || controller.signal.aborted) {
					return;
				}
				player.src({ src: masterPlaylistUrl(target), type: "application/x-mpegURL" });
				setPhase({ sourceKey: key, phase: { kind: "playing" } });
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted) {
					return;
				}
				const reason = error instanceof Error ? `（${error.message}）` : "";
				setPhase({
					sourceKey: key,
					phase: { kind: "error", message: `配信を開始できませんでした${reason}` },
				});
			});

		const onPageHide = () => {
			leaveLive(target);
		};
		window.addEventListener("pagehide", onPageHide);

		return () => {
			controller.abort();
			window.removeEventListener("pagehide", onPageHide);
			leaveLive(target);
		};
	}, [serviceId, codec, quality, viewerId]);

	return (
		<div className="bg-video relative aspect-video w-full overflow-hidden">
			<div ref={attachPlayer} className="absolute inset-0" />
			{settingsHost != null && createPortal(<PlayerSettings {...settings} />, settingsHost)}
			{current.kind === "starting" && (
				<div className="bg-video text-fg-secondary pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm">
					<div className="border-line-strong border-t-accent size-8 animate-spin rounded-full border-2" />
					チューナーを起動しています…
				</div>
			)}
			{current.kind === "error" && (
				<div className="bg-video/80 text-fg absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-sm">
					<p>{current.message}</p>
					<button
						type="button"
						className="bg-accent text-on-accent hover:bg-accent-hover rounded-md px-4 py-2 font-medium"
						onClick={onRetry}
					>
						再読み込み
					</button>
				</div>
			)}
		</div>
	);
}
