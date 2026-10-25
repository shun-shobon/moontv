import { describe, expect, it } from "vitest";

import { remoteKeyRepeating, remoteKeyUp } from "./remote";

describe("remoteKeyUp", () => {
	it("離したときだけ返し、長押しは無視する", () => {
		expect(remoteKeyUp({ eventType: "down", eventKeyAction: "1" })).toBe("down");
		expect(remoteKeyUp({ eventType: "longDown", eventKeyAction: "1" })).toBeNull();
	});
});

describe("remoteKeyRepeating", () => {
	it("離したときと長押しの間を返し、長押しの終わりは返さない", () => {
		expect(remoteKeyRepeating({ eventType: "right", eventKeyAction: "1" })).toBe("right");
		expect(remoteKeyRepeating({ eventType: "longRight", eventKeyAction: "0" })).toBe("right");
		expect(remoteKeyRepeating({ eventType: "longRight", eventKeyAction: "1" })).toBeNull();
	});
});
