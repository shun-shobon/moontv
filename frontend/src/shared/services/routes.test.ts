import { startOfBroadcastDay } from "@moontv/core/domain/time";
import { describe, expect, it } from "vitest";

import { guidePath, parseGuideDate, parseServiceId, watchPath } from "./routes";

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

describe("parseGuideDate", () => {
	it("日付をその日の放送日の開始時刻にする", () => {
		expect(parseGuideDate("2026-10-17")).toBe(new Date(2026, 9, 17, 4).getTime());
	});

	it.each([null, "", "2026-1-7", "2026-10-17T00:00", "abc", "2026-02-31", "2026-13-01"])(
		"%j は解釈できない",
		(param) => {
			expect(parseGuideDate(param)).toBeNull();
		},
	);

	it("guidePath で作った URL の日付を同じ放送日に戻す", () => {
		// 深夜2時は前日の放送日に含まれる。
		const dayStart = startOfBroadcastDay(new Date(2026, 0, 1, 2).getTime());
		const url = new URL(guidePath(dayStart), "http://moontv.local");

		expect(url.searchParams.get("date")).toBe("2025-12-31");
		expect(parseGuideDate(url.searchParams.get("date"))).toBe(dayStart);
	});
});
