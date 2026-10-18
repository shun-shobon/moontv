import { describe, expect, it } from "vitest";

import { interruptedPhase, sessionKey, startFailurePhase } from "./live-session";

describe("sessionKey", () => {
	it("同じ配信でも試行回数が違えば別のキーにする", () => {
		const target = { serviceId: 1, codec: "hevc", quality: "720p", audio: "main" } as const;

		expect(sessionKey(target, 0)).not.toBe(sessionKey(target, 1));
	});

	it("音声が違えば別の配信にする", () => {
		const target = { serviceId: 1, codec: "hevc", quality: "720p", audio: "main" } as const;

		expect(sessionKey(target, 0)).not.toBe(sessionKey({ ...target, audio: "sub" }, 0));
	});
});

describe("startFailurePhase", () => {
	it("サーバーが返した理由を添える", () => {
		expect(startFailurePhase(new Error("Tuner is busy."), null)).toEqual({
			kind: "error",
			message: "配信を開始できませんでした（Tuner is busy.）",
		});
	});

	it("理由が分からなければ添えない", () => {
		expect(startFailurePhase("unknown", null)).toEqual({
			kind: "error",
			message: "配信を開始できませんでした",
		});
	});

	it("録画がチューナーを使っていれば、その旨だけを伝える", () => {
		expect(startFailurePhase(new Error("no tuner is available"), "recording")).toEqual({
			kind: "error",
			message: "録画中のため、チューナーが空いていません",
		});
	});
});

describe("interruptedPhase", () => {
	it("止められた理由を出す", () => {
		expect(interruptedPhase("recording")).toEqual({
			kind: "error",
			message: "録画が始まったため、視聴を止めました",
		});
	});

	it("理由が分からなければ中断だけを伝える", () => {
		expect(interruptedPhase(null)).toEqual({ kind: "error", message: "再生が中断されました" });
	});
});
