import type { Codec } from "../../api/schemas";
import type { Preferences } from "../../media/preferences";

const CODEC_LABELS: Record<Preferences["codec"], string> = {
	auto: "自動",
	hevc: "HEVC",
	h264: "H.264",
};

export const codecOptions = (codecs: readonly Codec[]): Preferences["codec"][] => [
	"auto",
	...codecs,
];

/** 自動選択の結果を利用者が確かめられるよう、実際に使っているコーデックを添える。 */
export const codecOptionLabel = (option: Preferences["codec"], activeCodec: Codec) =>
	option === "auto" ? `自動 (${CODEC_LABELS[activeCodec]})` : CODEC_LABELS[option];
