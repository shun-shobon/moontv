import { describe, expect, it, vi } from "vitest";

import { createStore } from "./store";

describe("createStore", () => {
	it("更新した値を返し、購読者に知らせる", () => {
		const store = createStore(1);
		const onChange = vi.fn();
		store.subscribe(onChange);

		store.set(2);

		expect(store.get()).toBe(2);
		expect(onChange).toHaveBeenCalledOnce();
	});

	it("購読を解除すると知らせない", () => {
		const store = createStore(1);
		const onChange = vi.fn();
		const unsubscribe = store.subscribe(onChange);

		unsubscribe();
		store.set(2);

		expect(onChange).not.toHaveBeenCalled();
	});
});
