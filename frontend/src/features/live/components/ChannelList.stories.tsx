import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { CHANNELS } from "../../../../.storybook/fixtures";
import { ChannelList } from "./ChannelList";

const meta = {
	component: ChannelList,
	args: { channels: CHANNELS, activeId: null, layout: "grid" },
} satisfies Meta<typeof ChannelList>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Grid: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.queryByText("サブチャンネル")).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("radio", { name: "BS" }));
		await expect(canvas.getByText("BS放送")).toBeVisible();
		await expect(canvas.queryByText("テレビ総合")).not.toBeInTheDocument();
	},
};

export const List: Story = {
	args: { layout: "list", activeId: 101 },
	decorators: [
		(Story) => (
			<div className="max-w-sm">
				<Story />
			</div>
		),
	],
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("radio", { name: "BS" })).toBeChecked();
	},
};
