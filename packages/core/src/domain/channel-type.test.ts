import { describe, expect, it } from "vitest";

import { channelTypeLabel } from "./channel-type";

describe("channelTypeLabel", () => {
	it.each([
		["GR", "地デジ"],
		["SKY", "スカパー"],
		["UNKNOWN", "UNKNOWN"],
	])("%s を %s と表示する", (type, label) => {
		expect(channelTypeLabel(type)).toBe(label);
	});
});
