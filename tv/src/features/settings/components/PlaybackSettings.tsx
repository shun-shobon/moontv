import type { Codec, Quality } from "@moontv/core/api/schemas";
import type { PlaybackPreferences } from "@moontv/core/domain/preferences";
import { codecOptionLabel, codecOptions } from "@moontv/core/services/player-settings";
import { View } from "react-native";

import { SettingRow } from "./SettingRow";

type Props = {
	qualities: readonly Quality[];
	/** この TV で再生できるもの。 */
	codecs: readonly Codec[];
	/** 「自動」で選ばれるコーデック。 */
	autoCodec: Codec;
	preferences: PlaybackPreferences;
	onChange: (preferences: PlaybackPreferences) => void;
};

const next = <T,>(options: readonly T[], current: T): T =>
	options[(options.indexOf(current) + 1) % options.length] ?? current;

export function PlaybackSettings({ qualities, codecs, autoCodec, preferences, onChange }: Props) {
	const codecChoices = codecOptions(codecs);
	return (
		<View style={{ gap: 8 }}>
			<SettingRow
				label="画質"
				value={preferences.quality}
				hasTVPreferredFocus
				onPress={() => {
					onChange({ ...preferences, quality: next(qualities, preferences.quality) });
				}}
			/>
			<SettingRow
				label="コーデック"
				value={codecOptionLabel(preferences.codec, autoCodec)}
				onPress={() => {
					onChange({ ...preferences, codec: next(codecChoices, preferences.codec) });
				}}
			/>
			<SettingRow
				label="字幕"
				value={preferences.captions ? "オン" : "オフ"}
				onPress={() => {
					onChange({ ...preferences, captions: !preferences.captions });
				}}
			/>
		</View>
	);
}
