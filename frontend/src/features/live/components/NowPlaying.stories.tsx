import type { Meta, StoryObj } from "@storybook/react-vite";

import { channel } from "../../../../.storybook/fixtures";
import { NowPlaying } from "./NowPlaying";

const meta = {
	component: NowPlaying,
} satisfies Meta<typeof NowPlaying>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { channel: channel() } };

export const NoProgram: Story = { args: { channel: channel({ present: null }) } };

export const UnknownChannel: Story = { args: { channel: undefined } };
