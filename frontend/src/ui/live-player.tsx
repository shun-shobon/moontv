import "@videojs/react/i18n/locales/ja/register";
import {
	BufferingIndicator,
	Container,
	Controls,
	FullscreenButton,
	LiveButton,
	MuteButton,
	PiPButton,
	PlayButton,
	VolumeSlider,
} from "@videojs/react";
import { I18nProvider } from "@videojs/react/i18n";
import {
	FullscreenEnterIcon,
	FullscreenExitIcon,
	PipEnterIcon,
	PipExitIcon,
	PlayIcon,
	SpinnerIcon,
	VolumeHighIcon,
	VolumeLowIcon,
	VolumeOffIcon,
} from "@videojs/react/icons";
import { LiveVideoPlayer, usePlayer } from "@videojs/react/live-video";
import { HlsVideo } from "@videojs/react/media/hls-video";
import { useCallback, useEffect, useRef, useState } from "react";

import type { LiveTarget } from "../api/client";
import { leaveLive, masterPlaylistUrl, startLive } from "../api/client";
import type { Codec, Quality } from "../api/schemas";
import { createViewerId } from "../media/viewer-id";
import type { StreamSettingsProps } from "./player-settings";
import { PlayerSettings } from "./player-settings";

/** iOS は全画面を閉じた直後に動画を一時停止するが、その pause は全画面の終了通知より後に届くことがある。 */
const FULLSCREEN_EXIT_RESUME_WINDOW_MS = 2_000;

/**
 * 一時停止中にライブの最新位置から遅れた分を、再生再開時に取り戻す。
 * seekable の終端は再生可能な最新位置で、通常の再生でも 2〜3 秒後ろを再生しているため、それを超えた遅れだけを対象にする。
 */
const LIVE_EDGE_TOLERANCE_SECONDS = 3;

const seekToLiveEdgeIfBehind = (video: HTMLVideoElement) => {
	if (video.seekable.length === 0) {
		return;
	}
	const liveEdge = video.seekable.end(video.seekable.length - 1);
	if (liveEdge - video.currentTime > LIVE_EDGE_TOLERANCE_SECONDS) {
		video.currentTime = liveEdge;
	}
};

const resume = (video: HTMLVideoElement) => {
	video.play().catch(() => {
		// 再生を拒否されても、一時停止中に表示する中央の再生ボタンから再開できる。
	});
};

/** 音声付きの自動再生を拒否されたら、ミュートして再生だけは始める。 */
const autoplay = (video: HTMLVideoElement) => {
	video.play().catch((error: unknown) => {
		if (error instanceof DOMException && error.name === "NotAllowedError") {
			video.muted = true;
			resume(video);
		}
	});
};

const CONTROL_BUTTON =
	"flex h-full w-10 items-center justify-center text-fg hover:text-accent-hover data-disabled:opacity-50";

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
		<I18nProvider locale="ja">
			<LiveVideoPlayer key={attempt}>
				<PlayerView
					{...props}
					onRetry={() => {
						setAttempt((n) => n + 1);
					}}
				/>
			</LiveVideoPlayer>
		</I18nProvider>
	);
}

function PlayerView({
	serviceId,
	codec,
	quality,
	settings,
	onRetry,
}: Props & { onRetry: () => void }) {
	const [viewerId] = useState(createViewerId);
	const sourceKey = `${serviceId}/${codec}/${quality}`;
	const sourceKeyRef = useRef(sourceKey);
	const [phase, setPhase] = useState<{ sourceKey: string; phase: Phase } | null>(null);
	const current: Phase = phase?.sourceKey === sourceKey ? phase.phase : { kind: "starting" };

	const onMediaError = useCallback(() => {
		setPhase({
			sourceKey: sourceKeyRef.current,
			phase: { kind: "error", message: "再生が中断されました" },
		});
	}, []);

	useEffect(() => {
		const target: LiveTarget = { serviceId, codec, quality, viewerId };
		const key = `${serviceId}/${codec}/${quality}`;
		const controller = new AbortController();
		sourceKeyRef.current = key;

		startLive(target, controller.signal)
			.then(() => {
				if (controller.signal.aborted) {
					return;
				}
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
		<Container className="relative aspect-video w-full overflow-hidden bg-video">
			{/* 切り替え中は旧ソースを外し、旧チャンネルの再生を止める。 */}
			{current.kind === "playing" && (
				<LiveMedia
					key={sourceKey}
					src={masterPlaylistUrl({ serviceId, codec, quality, viewerId })}
				/>
			)}
			<MediaErrorWatcher onError={onMediaError} />
			<BufferingIndicator
				className="pointer-events-none absolute inset-0 flex items-center justify-center text-fg not-data-visible:hidden"
				render={(props) => (
					<div {...props}>
						<SpinnerIcon className="size-12" />
					</div>
				)}
			/>
			{/* 一時停止ボタンを置かないので、OS などに止められたときの再開手段として出す。 */}
			<PlayButton
				className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-canvas/75 text-fg hover:text-accent-hover"
				render={(props, state) =>
					state.paused ? (
						<button {...props}>
							<PlayIcon className="size-9" />
						</button>
					) : null
				}
			/>
			<Controls.Root>
				<Controls.Content className="absolute inset-x-0 bottom-0 transition-opacity duration-200 not-data-visible:pointer-events-none not-data-visible:opacity-0">
					<Controls.Group
						aria-label="再生コントロール"
						className="flex h-10 items-center bg-canvas/75 text-fg"
					>
						<MuteButton
							className={CONTROL_BUTTON}
							render={(props, state) => (
								<button {...props}>
									{state.volumeLevel === "off" ? (
										<VolumeOffIcon />
									) : state.volumeLevel === "high" ? (
										<VolumeHighIcon />
									) : (
										<VolumeLowIcon />
									)}
								</button>
							)}
						/>
						<VolumeSlider.Root className="relative mr-2 flex h-full w-20 cursor-pointer items-center">
							<VolumeSlider.Track className="relative h-1 w-full rounded-full bg-fg/30">
								<VolumeSlider.Fill className="absolute inset-y-0 left-0 w-(--media-slider-fill) rounded-full bg-accent" />
							</VolumeSlider.Track>
							<VolumeSlider.Thumb className="absolute left-(--media-slider-fill) size-3 -translate-x-1/2 rounded-full bg-fg" />
						</VolumeSlider.Root>
						<LiveButton className="group/live flex h-full items-center gap-1.5 px-2 text-caption-strong text-fg-secondary not-data-live:hidden data-live-edge:text-fg">
							<span className="size-2 rounded-full bg-fg-muted group-data-live-edge/live:bg-accent" />
							ライブ
						</LiveButton>
						<div className="flex-1" />
						<PlayerSettings {...settings} />
						<PiPButton
							className={CONTROL_BUTTON}
							render={(props, state) => (
								<button {...props}>{state.pip ? <PipExitIcon /> : <PipEnterIcon />}</button>
							)}
						/>
						<FullscreenButton
							className={CONTROL_BUTTON}
							render={(props, state) => (
								<button {...props}>
									{state.fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
								</button>
							)}
						/>
					</Controls.Group>
				</Controls.Content>
			</Controls.Root>
			{current.kind === "starting" && (
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-video text-label text-fg-secondary">
					<div className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
					チューナーを起動しています…
				</div>
			)}
			{current.kind === "error" && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-video/80 p-6 text-center text-label text-fg">
					<p>{current.message}</p>
					<button
						type="button"
						className="rounded-md bg-accent px-4 py-2 text-action text-on-accent hover:bg-accent-hover"
						onClick={onRetry}
					>
						再読み込み
					</button>
				</div>
			)}
		</Container>
	);
}

function LiveMedia({ src }: { src: string }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const isFullscreen = usePlayer((state) => state.isFullscreen);
	const wasFullscreenRef = useRef(false);
	const fullscreenExitedAtRef = useRef(Number.NEGATIVE_INFINITY);

	useEffect(() => {
		const wasFullscreen = wasFullscreenRef.current;
		wasFullscreenRef.current = isFullscreen;
		const video = videoRef.current;
		if (isFullscreen || !wasFullscreen || video == null) {
			return;
		}
		fullscreenExitedAtRef.current = performance.now();
		if (video.paused) {
			resume(video);
		}
	}, [isFullscreen]);

	return (
		<HlsVideo
			ref={videoRef}
			src={src}
			className="size-full object-contain"
			playsInline
			preload="auto"
			onLoadStart={(event) => {
				autoplay(event.currentTarget);
			}}
			onPlay={(event) => {
				seekToLiveEdgeIfBehind(event.currentTarget);
			}}
			onPause={(event) => {
				if (performance.now() - fullscreenExitedAtRef.current < FULLSCREEN_EXIT_RESUME_WINDOW_MS) {
					resume(event.currentTarget);
				}
			}}
		/>
	);
}

function MediaErrorWatcher({ onError }: { onError: () => void }) {
	const error = usePlayer((state) => state.error);

	useEffect(() => {
		if (error != null) {
			onError();
		}
	}, [error, onError]);

	return null;
}
