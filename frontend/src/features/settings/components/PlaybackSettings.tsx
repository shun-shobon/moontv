import type { Codec, Quality } from "../../../shared/api/schemas";
import { Button } from "../../../shared/components/Button";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import type { Preferences } from "../../player/media/preferences";
import { codecOptionLabel, codecOptions } from "../../player/services/player-settings";
import { SettingRow } from "./SettingRow";
import { SwitchRow } from "./SwitchRow";

type Props = {
	qualities: readonly Quality[];
	/** サーバーが配信でき、このブラウザーで再生できるコーデック。 */
	codecs: readonly Codec[];
	/** 「自動」で使うコーデック。 */
	autoCodec: Codec;
	preferences: Preferences;
	isDefault: boolean;
	onChange: (preferences: Preferences) => void;
	onReset: () => void;
};

export function PlaybackSettings({
	qualities,
	codecs,
	autoCodec,
	preferences,
	isDefault,
	onChange,
	onReset,
}: Props) {
	return (
		<div className="divide-y divide-line">
			<SettingRow
				label="画質"
				description="映像が途切れるときや通信量を抑えたいときは下げてください。"
			>
				<SegmentedControl
					label="画質"
					options={qualities}
					value={preferences.quality}
					format={(q) => q}
					onChange={(quality) => {
						onChange({ ...preferences, quality });
					}}
					className="flex flex-wrap gap-1"
				/>
			</SettingRow>
			<SettingRow
				label="コーデック"
				description="自動では、このブラウザーで再生できるうち圧縮効率の高いものを使います。"
			>
				<SegmentedControl
					label="コーデック"
					options={codecOptions(codecs)}
					value={preferences.codec}
					format={(c) => codecOptionLabel(c, autoCodec)}
					onChange={(codec) => {
						onChange({ ...preferences, codec });
					}}
					className="flex flex-wrap gap-1"
				/>
			</SettingRow>
			<SwitchRow
				label="字幕"
				description="字幕と文字スーパーを映像に重ねます。iPhone の全画面表示では出せません。"
				checked={preferences.captions}
				onChange={(captions) => {
					onChange({ ...preferences, captions });
				}}
			/>
			<SwitchRow
				label="アンビエントモード"
				description="映像の色を周りにぼかして広げます。"
				checked={preferences.ambient}
				onChange={(ambient) => {
					onChange({ ...preferences, ambient });
				}}
			/>
			<div className="flex justify-end p-2">
				<Button variant="quiet" isDisabled={isDefault} onPress={onReset}>
					初期値に戻す
				</Button>
			</div>
		</div>
	);
}
