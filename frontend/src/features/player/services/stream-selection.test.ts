import { describe, expect, it } from "vitest";

import type { Codec, Status } from "../../../shared/api/schemas";
import { resolveCodec, resolveQuality } from "./stream-selection";

describe("resolveCodec", () => {
	it("自動選択ではサーバーが先に挙げた再生可能なコーデックを選ぶ", () => {
		expect(resolveCodec("auto", status(), () => true)).toBe("hevc");
	});

	it("自動選択でブラウザーが HEVC を再生できなければ H.264 にする", () => {
		expect(resolveCodec("auto", status(), onlyH264)).toBe("h264");
	});

	it("指定したコーデックが再生可能ならそれを選ぶ", () => {
		expect(resolveCodec("h264", status(), () => true)).toBe("h264");
	});

	it("指定したコーデックを再生できなければ再生可能なものに切り替える", () => {
		expect(resolveCodec("hevc", status(), onlyH264)).toBe("h264");
	});

	it("指定したコーデックをサーバーが提供していなければ提供されたものを選ぶ", () => {
		expect(resolveCodec("hevc", status({ codecs: ["h264"] }), () => true)).toBe("h264");
	});

	it("再生可能なコーデックがなければ H.264 にする", () => {
		expect(resolveCodec("auto", status(), () => false)).toBe("h264");
	});
});

describe("resolveQuality", () => {
	it("サーバーが提供する画質なら保存済みの画質を使う", () => {
		expect(resolveQuality("540p", status())).toBe("540p");
	});

	it("サーバーが提供しない画質なら 720p にする", () => {
		expect(resolveQuality("1080p", status({ qualities: ["720p", "360p"] }))).toBe("720p");
	});
});

function onlyH264(codec: Codec) {
	return codec === "h264";
}

function status(overrides: Partial<Status> = {}): Status {
	return {
		version: "0.1.0",
		encoder: "software",
		codecs: ["hevc", "h264"],
		qualities: ["1080p", "720p", "540p", "360p"],
		...overrides,
	};
}
