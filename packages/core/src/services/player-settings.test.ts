import { describe, expect, it } from "vitest";

import { audioOptionLabel, codecOptionLabel, codecOptions } from "./player-settings";

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

describe("audioOptionLabel", () => {
	const audios = [
		{ track: "main", lang: "jpn" },
		{ track: "sub", lang: "eng" },
	] as const;

	it("主音声・副音声に言語名を添える", () => {
		expect(audioOptionLabel("main", audios)).toBe("主音声（日本語）");
		expect(audioOptionLabel("sub", audios)).toBe("副音声（英語）");
	});

	it("名前を知らない言語は言語コードのまま添える", () => {
		expect(audioOptionLabel("sub", [{ track: "sub", lang: "fra" }])).toBe("副音声（fra）");
	});

	it("言語が分からなければ添えない", () => {
		expect(audioOptionLabel("sub", [{ track: "sub", lang: null }])).toBe("副音声");
	});
});
