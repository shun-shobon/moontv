import { useStatus } from "@moontv/core/api/queries";

import { ServerSettings } from "../components/ServerSettings";

type Props = {
	serverUrl: string;
	onChangeServer: () => void;
};

export function SettingsTab({ serverUrl, onChangeServer }: Props) {
	const status = useStatus();
	return (
		<ServerSettings serverUrl={serverUrl} status={status.data} onChangeServer={onChangeServer} />
	);
}
