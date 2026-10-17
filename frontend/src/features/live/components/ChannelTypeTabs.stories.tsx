import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { ChannelTypeTabs } from "./ChannelTypeTabs";

const meta = {
	component: ChannelTypeTabs,
	args: { types: ["GR", "BS", "CS", "SKY"], current: "GR", onSelect: fn() },
} satisfies Meta<typeof ChannelTypeTabs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("radio", { name: "スカパー" }));
		await expect(args.onSelect).toHaveBeenCalledWith("SKY");
	},
};
