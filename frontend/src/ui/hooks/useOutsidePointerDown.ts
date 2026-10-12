import type { RefObject } from "react";
import { useEffect } from "react";

export const useOutsidePointerDown = (
	ref: RefObject<HTMLElement | null>,
	enabled: boolean,
	onOutside: () => void,
) => {
	useEffect(() => {
		const onPointerDown = (event: PointerEvent) => {
			const inside = event.target instanceof Node && (ref.current?.contains(event.target) ?? false);
			if (!inside) {
				onOutside();
			}
		};
		if (enabled) {
			document.addEventListener("pointerdown", onPointerDown);
		}
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
		};
	}, [ref, enabled, onOutside]);
};
