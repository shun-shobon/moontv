import { describe, expect, it } from "vitest";

import { shouldIntercept } from "./navigation";

const ORIGIN = "http://moontv.local";

describe("shouldIntercept", () => {
	it("同一オリジンのページ遷移を横取りする", () => {
		expect(shouldIntercept(target(), ORIGIN)).toBe(true);
	});

	it.each([
		["横取りできない遷移", { canIntercept: false }],
		["再読み込み", { navigationType: "reload" as const }],
		["ハッシュだけの変更", { hashChange: true }],
		["ダウンロード", { downloadRequest: "logo.png" }],
		["別オリジンへの遷移", { destination: new URL("https://example.com/guide") }],
		["API へのアクセス", { destination: new URL(`${ORIGIN}/api/channels/1/logo`) }],
	])("%sは横取りしない", (_, overrides) => {
		expect(shouldIntercept(target(overrides), ORIGIN)).toBe(false);
	});
});

function target(overrides: Partial<Parameters<typeof shouldIntercept>[0]> = {}) {
	return {
		canIntercept: true,
		navigationType: "push" as const,
		hashChange: false,
		downloadRequest: null,
		destination: new URL(`${ORIGIN}/guide`),
		...overrides,
	};
}
