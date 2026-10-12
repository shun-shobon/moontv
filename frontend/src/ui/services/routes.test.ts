import { describe, expect, it } from "vitest";

import { resolveRoute, watchPath } from "./routes";

describe("resolveRoute", () => {
	it.each([
		["/", { name: "home" }],
		["/guide", { name: "guide" }],
		["/watch/1024", { name: "watch", serviceId: 1024 }],
	])("%s を対応する画面に解決する", (pathname, expected) => {
		expect(resolveRoute(pathname)).toEqual(expected);
	});

	it.each(["/watch/abc", "/watch/-1", "/unknown"])(
		"%s のように解決できないパスはホームにする",
		(pathname) => {
			expect(resolveRoute(pathname)).toEqual({ name: "home" });
		},
	);

	it("watchPath で作ったパスを同じサービスの視聴画面に解決する", () => {
		expect(resolveRoute(watchPath(3273601024))).toEqual({ name: "watch", serviceId: 3273601024 });
	});
});
