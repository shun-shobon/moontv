import { useMemo } from "react";

import { useChannels, useStatus } from "../../../shared/api/queries";
import { CodecSchema } from "../../../shared/api/schemas";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { usePreferences } from "../../player/containers/hooks/usePreferences";
import { browserSupports } from "../../player/media/codec-support";
import { DEFAULT_PREFERENCES, isDefaultPreferences } from "../../player/media/preferences";
import { resolveCodec } from "../../player/services/stream-selection";
import { useTuners } from "../api/queries";
import { BrowserSupport } from "../components/BrowserSupport";
import { PlaybackSettings } from "../components/PlaybackSettings";
import { ServerInfo } from "../components/ServerInfo";
import { SettingsSection } from "../components/SettingsSection";
import { TunerList } from "../components/TunerList";

export function SettingsPage() {
	const status = useStatus();
	const channels = useChannels();
	const tuners = useTuners();
	const [preferences, updatePreferences] = usePreferences();
	const channelById = useMemo(() => new Map(channels.data?.map((c) => [c.id, c])), [channels.data]);
	const support = useMemo(
		() => CodecSchema.options.map((codec) => ({ codec, playable: browserSupports(codec) })),
		[],
	);

	if (status.data == null) {
		return (
			<StatusMessage>
				{status.isError ? "サーバーの情報を取得できませんでした。" : "読み込み中…"}
			</StatusMessage>
		);
	}

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
			<SettingsSection title="再生">
				<PlaybackSettings
					qualities={status.data.qualities}
					codecs={status.data.codecs.filter(browserSupports)}
					autoCodec={resolveCodec("auto", status.data, browserSupports)}
					preferences={preferences}
					isDefault={isDefaultPreferences(preferences)}
					onChange={updatePreferences}
					onReset={() => {
						updatePreferences(DEFAULT_PREFERENCES);
					}}
				/>
			</SettingsSection>
			<SettingsSection title="チューナー">
				{tuners.data == null ? (
					<p className="p-4 text-label text-fg-muted">
						{tuners.isError ? "チューナーの情報を取得できませんでした。" : "読み込み中…"}
					</p>
				) : (
					<TunerList tuners={tuners.data} channelById={channelById} />
				)}
			</SettingsSection>
			<SettingsSection title="このブラウザー">
				<BrowserSupport support={support} />
			</SettingsSection>
			<SettingsSection title="サーバー">
				<ServerInfo status={status.data} />
			</SettingsSection>
		</div>
	);
}
