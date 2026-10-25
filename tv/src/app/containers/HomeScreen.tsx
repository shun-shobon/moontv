import { useRef } from "react";
import type { HostInstance } from "react-native";
import { StyleSheet, View } from "react-native";

import type { GuidePosition } from "../../features/guide/containers/GuideTab";
import { GuideTab } from "../../features/guide/containers/GuideTab";
import { LiveTab } from "../../features/live/containers/LiveTab";
import { RecordingsTab } from "../../features/recording/containers/RecordingsTab";
import { SettingsTab } from "../../features/settings/containers/SettingsTab";
import { requestTVFocus } from "../../shared/services/tv-focus";
import type { Tab } from "../components/TabBar";
import { TabBar } from "../components/TabBar";

type Props = {
	serverUrl: string;
	tab: Tab;
	focusId: number | null;
	guidePosition: GuidePosition | null;
	onSelectTab: (tab: Tab) => void;
	onWatch: (serviceId: number, from: Tab, guidePosition?: GuidePosition) => void;
	onPlayRecording: (programId: number) => void;
	onChangeServer: () => void;
};

export function HomeScreen({
	serverUrl,
	tab,
	focusId,
	guidePosition,
	onSelectTab,
	onWatch,
	onPlayRecording,
	onChangeServer,
}: Props) {
	const selectedTabRef = useRef<HostInstance>(null);

	const content = () => {
		if (tab === "live") {
			return (
				<LiveTab
					focusId={focusId}
					onWatch={(channel) => {
						onWatch(channel.id, "live");
					}}
				/>
			);
		}
		if (tab === "guide") {
			return (
				<GuideTab
					initialPosition={guidePosition}
					onWatch={(serviceId, position) => {
						onWatch(serviceId, "guide", position);
					}}
					onBack={() => {
						requestTVFocus(selectedTabRef.current);
					}}
				/>
			);
		}
		if (tab === "recordings") {
			return (
				<RecordingsTab
					focusId={focusId}
					onPlay={onPlayRecording}
					onWatch={(serviceId) => {
						onWatch(serviceId, "recordings");
					}}
					onFocusLost={() => {
						requestTVFocus(selectedTabRef.current);
					}}
				/>
			);
		}
		return <SettingsTab serverUrl={serverUrl} onChangeServer={onChangeServer} />;
	};

	return (
		<View style={styles.container}>
			<TabBar selected={tab} onSelect={onSelectTab} selectedRef={selectedTabRef} />
			<View style={styles.content}>{content()}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1 },
});
