import type { Channel } from "../../api/schemas";

const TYPE_LABELS: Record<string, string> = { GR: "地デジ", BS: "BS", CS: "CS", SKY: "スカパー" };

export const channelTypeLabel = (type: string) => TYPE_LABELS[type] ?? type;

/** サブチャンネルは臨時編成のときしか放送しないので、放送中の番組がなければ出さない。 */
export const listedChannels = (channels: readonly Channel[], activeId: number | null) =>
	channels.filter((c) => !c.isSubchannel || c.present != null || c.id === activeId);

export const channelTypes = (channels: readonly Channel[]) => [
	...new Set(channels.map((c) => c.channelType)),
];

/** 利用者が選んだ種別を優先し、未選択なら視聴中のチャンネルの種別、それもなければ先頭の種別を開く。 */
export const currentChannelType = (
	channels: readonly Channel[],
	selectedType: string | null,
	activeId: number | null,
): string | undefined =>
	selectedType ?? channels.find((c) => c.id === activeId)?.channelType ?? channels[0]?.channelType;
