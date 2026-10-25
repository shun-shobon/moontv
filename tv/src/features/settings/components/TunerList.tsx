import type { Channel, Tuner } from "@moontv/core/api/schemas";
import { describeTunerUser, tunerTypesLabel } from "@moontv/core/services/tuner-usage";
import { StyleSheet, Text, View } from "react-native";

import { colors, text } from "../../../shared/theme";

type Props = {
	tuners: readonly Tuner[];
	channelById: ReadonlyMap<number, Channel>;
};

export function TunerList({ tuners, channelById }: Props) {
	return (
		<View style={styles.list}>
			{tuners.map((tuner) => (
				<View key={tuner.index} style={styles.tuner}>
					<Text style={styles.name} numberOfLines={1}>
						{tuner.name}　<Text style={styles.types}>{tunerTypesLabel(tuner)}</Text>
					</Text>
					{tuner.users.length === 0 ? (
						<Text style={styles.idle}>空き</Text>
					) : (
						tuner.users.map((user) => {
							const usage = describeTunerUser(user, channelById);
							return (
								<Text key={user.id} style={styles.usage} numberOfLines={1}>
									{usage.purpose}　{usage.title}
									{usage.detail != null && <Text style={styles.detail}>　{usage.detail}</Text>}
								</Text>
							);
						})
					)}
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	list: { gap: 8 },
	tuner: { gap: 2, padding: 12, borderRadius: 8, backgroundColor: colors.surface },
	name: { ...text.label, color: colors.fg },
	types: { color: colors.fgSubtle },
	idle: { ...text.label, color: colors.fgSubtle },
	usage: { ...text.label, color: colors.fgSecondary },
	detail: { color: colors.fgSubtle },
});
