import type { Meta, StoryObj } from "@storybook/react-vite";

import { channel } from "../../../.storybook/fixtures";
import { ChannelBadge } from "./ChannelBadge";

const meta = {
	component: ChannelBadge,
} satisfies Meta<typeof ChannelBadge>;
export default meta;

type Story = StoryObj<typeof meta>;

export const RemoteControlKey: Story = { args: { channel: channel() } };

export const ChannelNumber: Story = {
	args: { channel: channel({ remoteControlKeyId: null, channel: "BS15_0" }) },
};
