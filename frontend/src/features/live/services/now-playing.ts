import type { Channel } from "../../../shared/api/schemas";
import type { NowPlaying } from "../../player/media/media-session";
import { logoUrl } from "../api/urls";

const APP_ICON_URL = "/icon-512.png";

export const nowPlayingOf = (channel: Channel): NowPlaying => ({
	title: channel.present?.name ?? channel.name,
	artist: channel.name,
	artworkUrl: channel.hasLogo ? logoUrl(channel.id) : APP_ICON_URL,
});
