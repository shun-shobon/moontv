import type { Channel, Tuner, TunerUser } from "../api/schemas";
import { channelTypeLabel } from "../domain/channel-type";
import { codecLabel } from "./player-settings";

export type TunerUsage = {
	/** 何のための受信か。 */
	purpose: string;
	title: string;
	detail: string | null;
};

const UNKNOWN_CHANNEL = "不明なチャンネル";

export const tunerTypesLabel = (tuner: Tuner) => tuner.types.map(channelTypeLabel).join("・");

export const describeTunerUser = (
	user: TunerUser,
	channelById: ReadonlyMap<number, Channel>,
): TunerUsage => {
	const channelName = (serviceId: number) => channelById.get(serviceId)?.name ?? UNKNOWN_CHANNEL;
	if (user.kind === "live") {
		const viewers = user.viewers === 0 ? "視聴者なし" : `${user.viewers}人が視聴中`;
		const parts = [user.quality, codecLabel(user.codec), user.audio === "sub" && "副音声", viewers];
		return {
			purpose: "ライブ",
			title: channelName(user.serviceId),
			detail: parts.filter((p) => p !== false).join(" · "),
		};
	}
	if (user.kind === "recording") {
		return user.program == null
			? { purpose: "録画", title: "番組情報なし", detail: null }
			: { purpose: "録画", title: user.program.name, detail: channelName(user.program.serviceId) };
	}
	if (user.kind === "epg") {
		return { purpose: "mirakc", title: "番組情報の取得", detail: null };
	}
	return { purpose: "外部", title: user.name, detail: null };
};
