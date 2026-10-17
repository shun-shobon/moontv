import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "react-aria-components";
import { expect, fn } from "storybook/test";

import { ToggleOption } from "./ToggleOption";

const meta = {
	component: ToggleOption,
	args: { label: "アンビエントモード", onToggle: fn() },
	decorators: [
		(Story) => (
			<Menu
				aria-label="再生設定"
				className="flex w-56 flex-col rounded-xl bg-overlay/90 p-1.5 text-label"
			>
				<Story />
			</Menu>
		),
	],
} satisfies Meta<typeof ToggleOption>;
export default meta;

type Story = StoryObj<typeof meta>;

export const On: Story = {
	args: { checked: true },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("menuitemcheckbox", { name: "アンビエントモード" }));
		await expect(args.onToggle).toHaveBeenCalledWith(false);
	},
};

export const Off: Story = { args: { checked: false } };
