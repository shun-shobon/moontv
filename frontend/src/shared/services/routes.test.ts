import { describe, expect, it } from "vitest";

import { parseServiceId, watchPath } from "./routes";

describe("parseServiceId", () => {
	it("数字だけのパラメーターを数値にする", () => {
		expect(parseServiceId("1024")).toBe(1024);
	});

	it.each(["abc", "-1", "1.5", "", ["1024"]])("%j は解釈できない", (param) => {
		expect(parseServiceId(param)).toBeNull();
	});

	it("watchPath で作ったパスのパラメーターを元のサービス ID に戻す", () => {
		const param = watchPath(3273601024).split("/").at(-1);
		expect(parseServiceId(param)).toBe(3273601024);
	});
});
