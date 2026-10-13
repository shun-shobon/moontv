import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { PlayerErrorOverlay } from "./PlayerErrorOverlay";

const meta = {
	component: PlayerErrorOverlay,
	args: { message: "配信を開始できませんでした（チューナーが使用中です）", onRetry: fn() },
	decorators: [
		(Story) => (
			<div className="relative aspect-video max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PlayerErrorOverlay>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再読み込み" }));
		await expect(args.onRetry).toHaveBeenCalled();
	},
};
