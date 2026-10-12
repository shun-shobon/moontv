import { describe, expect, it } from "vitest";

import { codecOptionLabel, codecOptions } from "./player-settings";

describe("codecOptions", () => {
	it("自動選択を先頭に置き、サーバーが提供するコーデックを続ける", () => {
		expect(codecOptions(["hevc", "h264"])).toEqual(["auto", "hevc", "h264"]);
	});
});

describe("codecOptionLabel", () => {
	it("自動選択には実際に使っているコーデックを添える", () => {
		expect(codecOptionLabel("auto", "hevc")).toBe("自動 (HEVC)");
	});

	it("コーデックを指定する選択肢はコーデック名だけにする", () => {
		expect(codecOptionLabel("h264", "hevc")).toBe("H.264");
	});
});
