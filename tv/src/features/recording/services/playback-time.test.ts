import { describe, expect, it } from "vitest";

import { formatPlaybackTime } from "./playback-time";

describe("formatPlaybackTime", () => {
	it("1時間未満は分と秒、以上は時も出す", () => {
		expect(formatPlaybackTime(65_400)).toBe("1:05");
		expect(formatPlaybackTime(3_723_000)).toBe("1:02:03");
	});
});
