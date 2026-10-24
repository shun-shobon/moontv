import type { AudioTrack, Codec, Quality } from "./schemas";

let serverUrl = "";

/**
 * TV アプリは接続先を起動後に決めるため、モジュールの外から差し替える。
 * Web はページと同じサーバーなので origin を入れる。プレイヤーがプレイリスト内の相対パスをこの URL を基準に解決するため、空のままにはしない。
 */
export const setServerUrl = (url: string) => {
	serverUrl = url.replace(/\/+$/u, "");
};

export const apiUrl = (path: string) => `${serverUrl}${path}`;

export type LiveTarget = {
	serviceId: number;
	codec: Codec;
	quality: Quality;
	audio: AudioTrack;
	viewerId: string;
};

export const livePath = ({ serviceId, codec, quality, audio, viewerId }: LiveTarget) =>
	`/api/live/${serviceId}/${codec}/${quality}/${audio}/${viewerId}`;

export const masterPlaylistUrl = (target: LiveTarget) => apiUrl(`${livePath(target)}/master.m3u8`);

export const recordingPlaylistUrl = (programId: number) =>
	apiUrl(`/api/recordings/${programId}/media/media.m3u8`);

export const logoUrl = (serviceId: number) => apiUrl(`/api/channels/${serviceId}/logo`);
