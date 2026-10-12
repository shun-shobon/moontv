import type { Codec } from "../../../shared/api/schemas";

/** 1080p まで再生できるかを見るため、配信で最も高いレベルの文字列で判定する。 */
const PROBE_TYPES: Record<Codec, string> = {
	hevc: 'video/mp4; codecs="hvc1.1.6.L120.90"',
	h264: 'video/mp4; codecs="avc1.640028"',
};

/**
 * Safari はネイティブ HLS、それ以外は MSE で再生するため両方の経路で判定する。
 * iPhone の Safari は MSE を持たないがネイティブ HLS で HEVC を再生できる。
 */
export const browserSupports = (codec: Codec): boolean => {
	const type = PROBE_TYPES[codec];
	if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(type)) {
		return true;
	}
	return document.createElement("video").canPlayType(type) !== "";
};
