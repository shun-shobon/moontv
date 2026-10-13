import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { ToggleOption } from "./ToggleOption";

const meta = {
	component: ToggleOption,
	args: { label: "アンビエントモード", onToggle: fn() },
	decorators: [
		(Story) => (
			<div className="flex w-48 flex-col rounded-lg bg-overlay/95 p-3 text-label">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ToggleOption>;
export default meta;

type Story = StoryObj<typeof meta>;

export const On: Story = {
	args: { checked: true },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch"));
		await expect(args.onToggle).toHaveBeenCalledWith(false);
	},
};

export const Off: Story = { args: { checked: false } };
