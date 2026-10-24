import type { Channel } from "@moontv/core/api/schemas";
import { logoUrl } from "@moontv/core/api/urls";

const APP_ICON_URL = "/icon-512.png";

/** OS のメディア表示に出す画像。ロゴのないチャンネルではアプリのアイコンを使う。 */
export const channelArtworkUrl = (channel: Channel | undefined) =>
	channel == null || !channel.hasLogo ? APP_ICON_URL : logoUrl(channel.id);
