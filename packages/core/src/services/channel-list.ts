import type { Channel } from "../api/schemas";

/** サブチャンネルは臨時編成のときしか放送しないので、放送中の番組がなければ出さない。 */
export const listedChannels = (channels: readonly Channel[], activeId: number | null) =>
	channels.filter((c) => !c.isSubchannel || c.present != null || c.id === activeId);

export const channelTypes = (channels: readonly Channel[]) => [
	...new Set(channels.map((c) => c.channelType)),
];

export const currentChannelType = (
	channels: readonly Channel[],
	selectedType: string | null,
	activeId: number | null,
): string | undefined =>
	selectedType ?? channels.find((c) => c.id === activeId)?.channelType ?? channels[0]?.channelType;
