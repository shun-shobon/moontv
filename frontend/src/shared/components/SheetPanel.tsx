import { clsx } from "clsx";
import type { ReactNode } from "react";
import { useContext, useRef, useState } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { useMove } from "react-aria/useMove";

const CLOSE_DISTANCE_PX = 96;

/** ボタン欄を下に固定できるよう、スクロールは中身の側に任せる。 */
export function SheetPanel({ children }: { children: ReactNode }) {
	const state = useContext(OverlayTriggerStateContext);
	const [offset, setOffset] = useState(0);
	const [dragging, setDragging] = useState(false);
	// onMoveEnd の時点では、最後の onMove による state の更新がまだ描画に反映されていないことがある。
	const offsetRef = useRef(0);

	const { moveProps } = useMove({
		onMoveStart: () => {
			setDragging(true);
		},
		onMove: ({ deltaY }) => {
			offsetRef.current = Math.max(0, offsetRef.current + deltaY);
			setOffset(offsetRef.current);
		},
		onMoveEnd: () => {
			setDragging(false);
			if (offsetRef.current > CLOSE_DISTANCE_PX) {
				state?.close();
				return;
			}
			offsetRef.current = 0;
			setOffset(0);
		},
	});

	return (
		<div
			className={clsx(
				"flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-surface text-fg shadow-2xl ring-1 ring-line-strong sm:rounded-2xl",
				!dragging && "transition-[translate] duration-200 ease-out",
			)}
			style={{ translate: `0 ${offset}px` }}
		>
			<div
				{...moveProps}
				aria-hidden
				className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
			>
				<div className="h-1 w-10 rounded-full bg-line-strong" />
			</div>
			<div className="flex min-h-0 flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0">
				{children}
			</div>
		</div>
	);
}
