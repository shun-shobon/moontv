import { BufferingIndicator, Container } from "@videojs/react";
import { SpinnerIcon } from "@videojs/react/icons";
import { useState } from "react";

import { AmbientGlow } from "./AmbientGlow";
import { MediaErrorWatcher } from "./MediaErrorWatcher";
import { PlayerErrorOverlay } from "./PlayerErrorOverlay";
import { RecordingControls } from "./RecordingControls";
import { RecordingMedia } from "./RecordingMedia";

type Props = {
	src: string;
	captions: boolean;
	onCaptionsChange: (captions: boolean) => void;
	ambient: boolean;
	failed: boolean;
	onMediaError: () => void;
	onRetry: () => void;
};

export function RecordingPlayerView({
	src,
	captions,
	onCaptionsChange,
	ambient,
	failed,
	onMediaError,
	onRetry,
}: Props) {
	const [video, setVideo] = useState<HTMLVideoElement | null>(null);

	return (
		<div className="relative">
			{ambient && <AmbientGlow video={video} />}
			<Container className="relative aspect-video w-full overflow-hidden bg-video lg:rounded-xl">
				{!failed && <RecordingMedia src={src} showCaption={captions} onVideoChange={setVideo} />}
				<MediaErrorWatcher onError={onMediaError} />
				<BufferingIndicator
					className="pointer-events-none absolute inset-0 flex items-center justify-center text-fg not-data-visible:hidden"
					render={(props) => (
						<div {...props}>
							<SpinnerIcon className="size-12" />
						</div>
					)}
				/>
				<RecordingControls captions={captions} onCaptionsChange={onCaptionsChange} />
				{failed && <PlayerErrorOverlay message="再生できませんでした" onRetry={onRetry} />}
			</Container>
		</div>
	);
}
