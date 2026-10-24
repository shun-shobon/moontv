import type { LivePhase } from "@moontv/core/services/live-session";
import { StyleSheet, View } from "react-native";

import { Button } from "../../../shared/components/Button";
import { StatusMessage } from "../../../shared/components/StatusMessage";

type Props = {
	phase: LivePhase;
	onRetry: () => void;
};

export function PlayerStatus({ phase, onRetry }: Props) {
	if (phase.kind === "playing") {
		return null;
	}
	return (
		<View style={StyleSheet.absoluteFill}>
			{phase.kind === "starting" ? (
				<StatusMessage>配信を準備しています…</StatusMessage>
			) : (
				<StatusMessage action={<Button label="再試行" onPress={onRetry} hasTVPreferredFocus />}>
					{phase.message}
				</StatusMessage>
			)}
		</View>
	);
}
