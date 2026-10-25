import { useChannels, useStatus, useTuners } from "@moontv/core/api/queries";
import { CodecSchema } from "@moontv/core/api/schemas";
import { resolveCodec } from "@moontv/core/services/stream-selection";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { supportsCodec } from "../../../../modules/player";
import { StatusMessage } from "../../../shared/components/StatusMessage";
import { usePreferences } from "../../../shared/containers/hooks/usePreferences";
import { colors, SAFE_INSET, text } from "../../../shared/theme";
import { DeviceSupport } from "../components/DeviceSupport";
import { PlaybackSettings } from "../components/PlaybackSettings";
import { ServerSettings } from "../components/ServerSettings";
import { SettingsSection } from "../components/SettingsSection";
import { TunerList } from "../components/TunerList";

type Props = {
	serverUrl: string;
	onChangeServer: () => void;
};

export function SettingsTab({ serverUrl, onChangeServer }: Props) {
	const status = useStatus();
	const channels = useChannels();
	const tuners = useTuners();
	const [preferences, updatePreferences] = usePreferences();
	const channelById = useMemo(() => new Map(channels.data?.map((c) => [c.id, c])), [channels.data]);
	const support = useMemo(
		() => CodecSchema.options.map((codec) => ({ codec, playable: supportsCodec(codec) })),
		[],
	);

	if (status.data == null) {
		return (
			<StatusMessage>
				{status.isError ? "サーバーの情報を取得できませんでした" : "読み込み中…"}
			</StatusMessage>
		);
	}

	return (
		<ScrollView contentContainerStyle={styles.content}>
			<SettingsSection title="再生">
				<PlaybackSettings
					qualities={status.data.qualities}
					codecs={status.data.codecs.filter(supportsCodec)}
					autoCodec={resolveCodec("auto", status.data, supportsCodec)}
					preferences={preferences}
					onChange={updatePreferences}
				/>
			</SettingsSection>
			<SettingsSection title="チューナー">
				{tuners.data == null ? (
					<Text style={styles.message}>
						{tuners.isError ? "チューナーの情報を取得できませんでした" : "読み込み中…"}
					</Text>
				) : (
					<TunerList tuners={tuners.data} channelById={channelById} />
				)}
			</SettingsSection>
			<SettingsSection title="この TV">
				<DeviceSupport support={support} />
			</SettingsSection>
			<SettingsSection title="サーバー">
				<ServerSettings
					serverUrl={serverUrl}
					status={status.data}
					onChangeServer={onChangeServer}
				/>
			</SettingsSection>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: 24,
		width: 640,
		paddingHorizontal: SAFE_INSET.horizontal,
		paddingBottom: SAFE_INSET.vertical,
	},
	message: { ...text.label, color: colors.fgMuted },
});
