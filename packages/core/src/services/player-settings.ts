import type { Audio, AudioTrack, Codec } from "../api/schemas";
import type { CodecPreference } from "../domain/preferences";

const CODEC_LABELS: Record<CodecPreference, string> = {
	auto: "自動",
	hevc: "HEVC",
	h264: "H.264",
};

export const codecLabel = (codec: Codec) => CODEC_LABELS[codec];

export const codecOptions = (codecs: readonly Codec[]): CodecPreference[] => ["auto", ...codecs];

/** 自動選択の結果を利用者が確かめられるよう、実際に使っているコーデックを添える。 */
export const codecOptionLabel = (option: CodecPreference, activeCodec: Codec) =>
	option === "auto" ? `自動 (${CODEC_LABELS[activeCodec]})` : CODEC_LABELS[option];

const TRACK_LABELS: Record<AudioTrack, string> = {
	main: "主音声",
	sub: "副音声",
};

const LANGUAGE_LABELS: Record<string, string> = {
	jpn: "日本語",
	eng: "英語",
	kor: "韓国語",
	zho: "中国語",
	chi: "中国語",
};

/** 二か国語放送で聞き分けられるよう、分かれば言語を添える。 */
export const audioOptionLabel = (track: AudioTrack, audios: readonly Audio[]) => {
	const lang = audios.find((audio) => audio.track === track)?.lang;
	if (lang == null) {
		return TRACK_LABELS[track];
	}
	return `${TRACK_LABELS[track]}（${LANGUAGE_LABELS[lang] ?? lang}）`;
};
