import type { Channel } from "./schemas";

const APP_ICON_URL = "/icon-512.png";

export const logoUrl = (serviceId: number) => `/api/channels/${serviceId}/logo`;

/** OS のメディア表示に出す画像。ロゴのないチャンネルではアプリのアイコンを使う。 */
export const channelArtworkUrl = (channel: Channel | undefined) =>
	channel == null || !channel.hasLogo ? APP_ICON_URL : logoUrl(channel.id);
