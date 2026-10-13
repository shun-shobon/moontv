import type { Meta, StoryObj } from "@storybook/react-vite";

import { CHANNELS, channel } from "../../../../.storybook/fixtures";
import { ChannelCard } from "./ChannelCard";

const meta = {
	component: ChannelCard,
	args: { channel: channel(), active: false },
	decorators: [
		(Story) => (
			<div className="max-w-sm">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ChannelCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = { args: { active: true } };

export const LongName: Story = { args: { channel: CHANNELS[2]! } };

export const NoProgram: Story = {
	args: { channel: channel({ present: null, following: null }) },
};
