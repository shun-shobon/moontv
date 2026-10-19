import type { Status } from "../../../shared/api/schemas";
import { codecLabel } from "../../player/services/player-settings";
import { InfoList } from "./InfoList";

const ENCODER_LABELS: Record<string, string> = {
	vaapi: "VA-API",
	qsv: "Quick Sync Video",
	videotoolbox: "VideoToolbox",
	software: "ソフトウェア",
};

const enabled = (value: boolean) => (value ? "有効" : "無効");

export function ServerInfo({ status }: { status: Status }) {
	return (
		<InfoList
			items={[
				{ label: "バージョン", value: status.version },
				{ label: "エンコーダー", value: ENCODER_LABELS[status.encoder] ?? status.encoder },
				{ label: "配信できるコーデック", value: status.codecs.map(codecLabel).join("・") },
				{ label: "録画予約", value: enabled(status.recording) },
				{ label: "録画一覧", value: enabled(status.library) },
			]}
		/>
	);
}
