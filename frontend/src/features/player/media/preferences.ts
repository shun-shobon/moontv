import * as v from "valibot";

import { CodecSchema, QualitySchema } from "../../../shared/api/schemas";

const STORAGE_KEY = "moontv.preferences";

const PreferencesSchema = v.object({
	quality: QualitySchema,
	codec: v.union([v.literal("auto"), CodecSchema]),
	ambient: v.boolean(),
	// 後から足した項目なので、保存済みの設定に無くても他の項目を捨てずに読めるようにする。
	captions: v.optional(v.boolean(), false),
});
export type Preferences = v.InferOutput<typeof PreferencesSchema>;

/** 字幕は既定で出さない（TR-B14 第2巻 6.4）。 */
export const DEFAULT_PREFERENCES: Preferences = {
	quality: "1080p",
	codec: "auto",
	ambient: true,
	captions: false,
};

/** 項目を足したときに比べ忘れないよう、既定値の隣に置く。 */
export const isDefaultPreferences = ({ quality, codec, ambient, captions }: Preferences) =>
	quality === DEFAULT_PREFERENCES.quality &&
	codec === DEFAULT_PREFERENCES.codec &&
	ambient === DEFAULT_PREFERENCES.ambient &&
	captions === DEFAULT_PREFERENCES.captions;

export const loadPreferences = (): Preferences => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw == null) {
			return DEFAULT_PREFERENCES;
		}
		const parsed = v.safeParse(PreferencesSchema, JSON.parse(raw));
		return parsed.success ? parsed.output : DEFAULT_PREFERENCES;
	} catch {
		// プライベートブラウズ等で storage が使えなくても既定値で再生できればよい。
		return DEFAULT_PREFERENCES;
	}
};

export const savePreferences = (preferences: Preferences): void => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// 保存できなくても今回の視聴には影響しない。
	}
};
