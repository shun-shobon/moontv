import { describe, expect, it } from "vitest";

import { reservationAction } from "./reservation";

describe("reservationAction", () => {
	it("予約していない番組は、終わっていなければ予約できる", () => {
		expect(reservationAction(null, false)).toEqual({ label: "録画予約", scheduled: true });
		expect(reservationAction(null, true)).toBeNull();
	});

	it("予約中は取り消し、録画中は止められる", () => {
		expect(reservationAction("scheduled", false)).toEqual({
			label: "予約を取り消す",
			scheduled: false,
		});
		expect(reservationAction("recording", false)).toEqual({
			label: "録画を止める",
			scheduled: false,
		});
	});

	it("終わった予約には操作を出さない", () => {
		expect(reservationAction("finished", true)).toBeNull();
		expect(reservationAction("failed", true)).toBeNull();
	});
});
