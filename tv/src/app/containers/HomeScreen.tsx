import { View, StyleSheet } from "react-native";

import { LiveTab } from "../../features/live/containers/LiveTab";
import { SettingsTab } from "../../features/settings/containers/SettingsTab";
import type { Tab } from "../components/TabBar";
import { TabBar } from "../components/TabBar";

type Props = {
	serverUrl: string;
	tab: Tab;
	focusId: number | null;
	onSelectTab: (tab: Tab) => void;
	onWatch: (serviceId: number) => void;
	onChangeServer: () => void;
};

export function HomeScreen({
	serverUrl,
	tab,
	focusId,
	onSelectTab,
	onWatch,
	onChangeServer,
}: Props) {
	return (
		<View style={styles.container}>
			<TabBar selected={tab} onSelect={onSelectTab} />
			<View style={styles.content}>
				{tab === "live" ? (
					<LiveTab
						focusId={focusId}
						onWatch={(channel) => {
							onWatch(channel.id);
						}}
					/>
				) : (
					<SettingsTab serverUrl={serverUrl} onChangeServer={onChangeServer} />
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flex: 1 },
});
