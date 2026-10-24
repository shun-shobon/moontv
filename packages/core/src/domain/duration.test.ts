import { describe, expect, it } from "vitest";

import { formatDuration } from "./duration";

describe("formatDuration", () => {
	it("分の端数を四捨五入する", () => {
		expect(formatDuration(302_235)).toBe("5分");
		expect(formatDuration(20_000)).toBe("1分");
	});

	it("1時間を超えたら時間と分で表す", () => {
		expect(formatDuration(65 * 60_000)).toBe("1時間5分");
		expect(formatDuration(120 * 60_000)).toBe("2時間");
	});
});
