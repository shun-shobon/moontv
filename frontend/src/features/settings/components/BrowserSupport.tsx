import type { Codec } from "../../../shared/api/schemas";
import { codecLabel } from "../../player/services/player-settings";
import { InfoList } from "./InfoList";

type Props = { support: readonly { codec: Codec; playable: boolean }[] };

export function BrowserSupport({ support }: Props) {
	return (
		<InfoList
			items={support.map(({ codec, playable }) => ({
				label: codecLabel(codec),
				value: playable ? "再生できる" : "再生できない",
			}))}
		/>
	);
}
