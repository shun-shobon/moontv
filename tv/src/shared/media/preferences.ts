import {
	DEFAULT_PLAYBACK_PREFERENCES,
	PlaybackPreferencesSchema,
} from "@moontv/core/domain/preferences";
import type { PlaybackPreferences } from "@moontv/core/domain/preferences";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as v from "valibot";

const STORAGE_KEY = "moontv.preferences";

export const loadPreferences = async (): Promise<PlaybackPreferences> => {
	const raw = await AsyncStorage.getItem(STORAGE_KEY);
	if (raw == null) {
		return DEFAULT_PLAYBACK_PREFERENCES;
	}
	try {
		const parsed = v.safeParse(PlaybackPreferencesSchema, JSON.parse(raw));
		return parsed.success ? parsed.output : DEFAULT_PLAYBACK_PREFERENCES;
	} catch {
		return DEFAULT_PLAYBACK_PREFERENCES;
	}
};

export const savePreferences = async (preferences: PlaybackPreferences): Promise<void> => {
	await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
};
