import type { Codec, Quality } from "../../../shared/api/schemas";

export type LiveTarget = {
	serviceId: number;
	codec: Codec;
	quality: Quality;
	viewerId: string;
};

export const livePath = ({ serviceId, codec, quality, viewerId }: LiveTarget) =>
	`/api/live/${serviceId}/${codec}/${quality}/${viewerId}`;

/** Video.js の HLS エンジンはプレイリスト内の相対パスをこの URL を基準に解決するため、絶対 URL にする。 */
export const masterPlaylistUrl = (target: LiveTarget) =>
	new URL(`${livePath(target)}/master.m3u8`, location.href).href;
