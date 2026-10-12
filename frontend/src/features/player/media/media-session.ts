export type NowPlaying = {
	title: string;
	artist: string;
	artworkUrl: string;
};

export const showNowPlaying = ({ title, artist, artworkUrl }: NowPlaying): void => {
	if (!("mediaSession" in navigator)) {
		return;
	}
	navigator.mediaSession.metadata = new MediaMetadata({
		title,
		artist,
		artwork: [{ src: artworkUrl }],
	});
};

export const clearNowPlaying = (): void => {
	if (!("mediaSession" in navigator)) {
		return;
	}
	navigator.mediaSession.metadata = null;
};
