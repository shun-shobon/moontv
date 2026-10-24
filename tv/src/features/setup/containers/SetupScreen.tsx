import { fetchStatus } from "@moontv/core/api/client";
import { setServerUrl } from "@moontv/core/api/urls";
import { useState } from "react";

import { saveServerUrl } from "../../../shared/media/server-url";
import { normalizeServerUrl } from "../../../shared/services/server-address";
import { ServerForm } from "../components/ServerForm";

type Props = {
	initialValue: string;
	onConnected: (url: string) => void;
};

export function SetupScreen({ initialValue, onConnected }: Props) {
	const [value, setValue] = useState(initialValue);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		const url = normalizeServerUrl(value);
		if (url == null) {
			setError("アドレスの形式が正しくありません");
			return;
		}
		setBusy(true);
		setError(null);
		setServerUrl(url);
		try {
			await fetchStatus();
		} catch {
			setError(`${url} に接続できませんでした。moontv が起動しているか確認してください`);
			setBusy(false);
			return;
		}
		await saveServerUrl(url);
		onConnected(url);
	};

	return (
		<ServerForm
			value={value}
			onChange={setValue}
			onSubmit={() => {
				void submit();
			}}
			busy={busy}
			error={error}
		/>
	);
}
