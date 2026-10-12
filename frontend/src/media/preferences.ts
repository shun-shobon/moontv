import * as v from "valibot";

import { CodecSchema, QualitySchema } from "../api/schemas";

const STORAGE_KEY = "moontv.preferences";

const PreferencesSchema = v.object({
	quality: QualitySchema,
	codec: v.union([v.literal("auto"), CodecSchema]),
});
export type Preferences = v.InferOutput<typeof PreferencesSchema>;

const DEFAULT_PREFERENCES: Preferences = { quality: "1080p", codec: "auto" };

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
