const TYPE_LABELS: Record<string, string> = { GR: "地デジ", BS: "BS", CS: "CS", SKY: "スカパー" };

export const channelTypeLabel = (type: string) => TYPE_LABELS[type] ?? type;
