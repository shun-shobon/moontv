import {
	DEFAULT_PLAYBACK_PREFERENCES,
	PlaybackPreferencesSchema,
} from "@moontv/core/domain/preferences";
import * as v from "valibot";

const STORAGE_KEY = "moontv.preferences";

const PreferencesSchema = v.object({
	...PlaybackPreferencesSchema.entries,
	ambient: v.boolean(),
});
export type Preferences = v.InferOutput<typeof PreferencesSchema>;

export const DEFAULT_PREFERENCES: Preferences = {
	...DEFAULT_PLAYBACK_PREFERENCES,
	ambient: true,
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
