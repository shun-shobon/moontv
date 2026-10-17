import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { ErrorPage } from "./ErrorPage";

const meta = {
	component: ErrorPage,
	args: { onReload: fn() },
} satisfies Meta<typeof ErrorPage>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再読み込み" }));
		await expect(args.onReload).toHaveBeenCalled();
	},
};
