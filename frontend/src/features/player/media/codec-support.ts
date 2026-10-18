import type { Codec } from "../../../shared/api/schemas";

/** 1080p まで再生できるかを見るため、配信で最も高いレベルの文字列で判定する。 */
const PROBE_TYPES: Record<Codec, string> = {
	hevc: 'video/mp4; codecs="hvc1.1.6.L120.90"',
	h264: 'video/mp4; codecs="avc1.640028"',
};

/** iPhone の Safari は MediaSource を持たない（hls.js は ManagedMediaSource を使う）ため、canPlayType でも判定する。 */
export const browserSupports = (codec: Codec): boolean => {
	const type = PROBE_TYPES[codec];
	if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(type)) {
		return true;
	}
	return document.createElement("video").canPlayType(type) !== "";
};
