import * as v from "valibot";

import { CodecSchema, QualitySchema } from "../api/schemas";

/** 保存先は環境ごとに違うため、ここでは形と既定値だけを決める。 */
export const PlaybackPreferencesSchema = v.object({
	quality: QualitySchema,
	codec: v.union([v.literal("auto"), CodecSchema]),
	// 後から足した項目なので、保存済みの設定に無くても他の項目を捨てずに読めるようにする。
	captions: v.optional(v.boolean(), false),
});
export type PlaybackPreferences = v.InferOutput<typeof PlaybackPreferencesSchema>;
export type CodecPreference = PlaybackPreferences["codec"];

/** 字幕は既定で出さない（TR-B14 第2巻 6.4）。 */
export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferences = {
	quality: "1080p",
	codec: "auto",
	captions: false,
};
