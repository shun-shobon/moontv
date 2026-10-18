import type { Channel } from "../../../shared/api/schemas";
import { channelArtworkUrl } from "../../../shared/api/urls";
import type { NowPlaying } from "../../player/media/media-session";

export const nowPlayingOf = (channel: Channel): NowPlaying => ({
	title: channel.present?.name ?? channel.name,
	artist: channel.name,
	artworkUrl: channelArtworkUrl(channel),
});
