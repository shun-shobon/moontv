import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { OptionGroup } from "./OptionGroup";

const meta = {
	component: OptionGroup<string>,
	args: {
		label: "画質",
		options: ["1080p", "720p", "540p", "360p"],
		value: "720p",
		format: (q: string) => q,
		onSelect: fn(),
	},
	decorators: [
		(Story) => (
			<div className="w-48 rounded-lg bg-overlay/95 p-3 text-label">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof OptionGroup<string>>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await expect(canvas.getByRole("button", { name: /720p/u })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await userEvent.click(canvas.getByRole("button", { name: "360p" }));
		await expect(args.onSelect).toHaveBeenCalledWith("360p");
	},
};
