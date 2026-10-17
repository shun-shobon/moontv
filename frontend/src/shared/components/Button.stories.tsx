import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
	component: Button,
	args: { children: "再読み込み", onPress: fn() },
} satisfies Meta<typeof Button>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: { variant: "primary" },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再読み込み" }));
		await expect(args.onPress).toHaveBeenCalled();
	},
};

export const Quiet: Story = { args: { variant: "quiet", children: "閉じる" } };

export const KeyboardFocus: Story = {
	args: { variant: "primary" },
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await expect(canvas.getByRole("button")).toHaveAttribute("data-focus-visible", "true");
	},
};
