import type { Meta, StoryObj } from "@storybook/react-vite";
import { OverlayTriggerStateContext } from "react-aria-components";
import { expect, fn } from "storybook/test";

import { SheetPanel } from "./SheetPanel";

const close = fn();

const meta = {
	component: SheetPanel,
	args: { children: <p className="p-6 pt-1 text-body">ハンドルを下に引くと閉じます。</p> },
	decorators: [
		(Story) => (
			<OverlayTriggerStateContext.Provider
				value={{
					isOpen: true,
					setOpen: fn(),
					open: fn(),
					close,
					toggle: fn(),
					point: null,
					setPoint: fn(),
				}}
			>
				<div className="max-w-sm pt-4">
					<Story />
				</div>
			</OverlayTriggerStateContext.Provider>
		),
	],
	beforeEach: () => {
		close.mockClear();
	},
} satisfies Meta<typeof SheetPanel>;
export default meta;

type Story = StoryObj<typeof meta>;

const dragHandle = (canvasElement: HTMLElement, distance: number) => {
	const handle = canvasElement.querySelector<HTMLElement>("[aria-hidden]");
	if (handle == null) {
		throw new Error("Handle is missing.");
	}
	const { x, y, width } = handle.getBoundingClientRect();
	const at = (dy: number) => ({
		pointerId: 1,
		pointerType: "touch",
		clientX: x + width / 2,
		clientY: y + dy,
		bubbles: true,
	});
	handle.dispatchEvent(new PointerEvent("pointerdown", { ...at(0), button: 0 }));
	window.dispatchEvent(new PointerEvent("pointermove", at(distance)));
	window.dispatchEvent(new PointerEvent("pointerup", { ...at(distance), button: 0 }));
};

export const DragToClose: Story = {
	play: async ({ canvasElement }) => {
		dragHandle(canvasElement, 200);
		await expect(close).toHaveBeenCalled();
	},
};

export const ShortDragStays: Story = {
	play: async ({ canvasElement }) => {
		dragHandle(canvasElement, 40);
		await expect(close).not.toHaveBeenCalled();
	},
};
