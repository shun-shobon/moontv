import { useEffect } from "react";

import type { NowPlaying } from "../../media/media-session";
import { clearNowPlaying, showNowPlaying } from "../../media/media-session";

export const useMediaSession = (nowPlaying: NowPlaying | undefined) => {
	const title = nowPlaying?.title;
	const artist = nowPlaying?.artist;
	const artworkUrl = nowPlaying?.artworkUrl;

	useEffect(() => {
		if (title == null || artist == null || artworkUrl == null) {
			clearNowPlaying();
			return;
		}
		showNowPlaying({ title, artist, artworkUrl });
	}, [title, artist, artworkUrl]);

	useEffect(() => clearNowPlaying, []);
};
