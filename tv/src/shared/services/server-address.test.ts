import { describe, expect, it } from "vitest";

import { normalizeServerUrl } from "./server-address";

describe("normalizeServerUrl", () => {
	it("スキームとポートを省略したら http と 40780 を補う", () => {
		expect(normalizeServerUrl(" 192.168.0.106 ")).toBe("http://192.168.0.106:40780");
	});

	it("指定したポートと末尾のスラッシュを扱う", () => {
		expect(normalizeServerUrl("HTTP://tv.local:8080/")).toBe("http://tv.local:8080");
	});

	it("https は既定のポートのままにする", () => {
		expect(normalizeServerUrl("https://tv.example.ts.net")).toBe("https://tv.example.ts.net");
	});

	it("全角で入った数字と記号を半角に直す", () => {
		expect(normalizeServerUrl("１９２．１６８．０．１０６")).toBe("http://192.168.0.106:40780");
	});

	it("空やパス付きは受け付けない", () => {
		expect(normalizeServerUrl("")).toBeNull();
		expect(normalizeServerUrl("http://host/api")).toBeNull();
	});
});
