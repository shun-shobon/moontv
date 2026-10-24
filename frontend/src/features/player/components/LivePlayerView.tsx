import type { LivePhase } from "@moontv/core/services/live-session";
import { BufferingIndicator, Container } from "@videojs/react";
import { SpinnerIcon } from "@videojs/react/icons";
import { useState } from "react";
import { UNSAFE_PortalProvider } from "react-aria/PortalProvider";

import { AmbientGlow } from "./AmbientGlow";
import { CenterPlayButton } from "./CenterPlayButton";
import { LiveMedia } from "./LiveMedia";
import { MediaErrorWatcher } from "./MediaErrorWatcher";
import { PlayerControls } from "./PlayerControls";
import { PlayerErrorOverlay } from "./PlayerErrorOverlay";
import type { PlayerSettingsProps } from "./PlayerSettings";
import { PlayerStartingOverlay } from "./PlayerStartingOverlay";

type Props = {
	phase: LivePhase;
	/** 配信を切り替えたら旧ソースを確実に外すためのキー。 */
	sourceKey: string;
	src: string;
	settings: PlayerSettingsProps;
	onMediaError: () => void;
	onRetry: () => void;
};

export function LivePlayerView({ phase, sourceKey, src, settings, onMediaError, onRetry }: Props) {
	const [video, setVideo] = useState<HTMLVideoElement | null>(null);
	// 全画面中は Container の外が見えないので、設定メニューなどのポップオーバーを Container の中に描く。
	const [container, setContainer] = useState<HTMLDivElement | null>(null);

	return (
		<div className="relative">
			{settings.preferences.ambient && <AmbientGlow video={video} />}
			<Container
				ref={setContainer}
				className="relative aspect-video w-full overflow-hidden bg-video lg:rounded-xl"
			>
				<UNSAFE_PortalProvider getContainer={() => container}>
					{/* 切り替え中は旧ソースを外し、旧チャンネルの再生を止める。 */}
					{phase.kind === "playing" && (
						<LiveMedia
							key={sourceKey}
							src={src}
							showCaption={settings.preferences.captions}
							onVideoChange={setVideo}
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
					<CenterPlayButton />
					<PlayerControls settings={settings} />
					{phase.kind === "starting" && <PlayerStartingOverlay />}
					{phase.kind === "error" && (
						<PlayerErrorOverlay message={phase.message} onRetry={onRetry} />
					)}
				</UNSAFE_PortalProvider>
			</Container>
		</div>
	);
}
