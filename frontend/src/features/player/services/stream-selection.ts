import type { Codec, Quality, Status } from "../../../shared/api/schemas";
import type { Preferences } from "../media/preferences";

/** サーバーが提供する画質に保存済みの画質がなければ、どの環境でも重すぎない画質にする。 */
const FALLBACK_QUALITY: Quality = "720p";

/** `status.codecs` はサーバーが圧縮効率の高い HEVC から並べるので、自動選択では再生できる先頭を使う。 */
export const resolveCodec = (
	preference: Preferences["codec"],
	status: Status,
	isPlayable: (codec: Codec) => boolean,
): Codec => {
	const playable = status.codecs.filter(isPlayable);
	if (preference !== "auto" && playable.includes(preference)) {
		return preference;
	}
	return playable[0] ?? "h264";
};

export const resolveQuality = (preference: Quality, status: Status): Quality =>
	status.qualities.includes(preference) ? preference : FALLBACK_QUALITY;
