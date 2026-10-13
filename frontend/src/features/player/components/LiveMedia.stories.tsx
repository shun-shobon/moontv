import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { withLivePlayer, withPlayerFrame } from "../../../../.storybook/decorators";
import { LiveMedia } from "./LiveMedia";

/** Storybook には配信サーバーがないため、src に HLS の URL を入れたときだけ映像が出る。 */
const meta = {
	component: LiveMedia,
	args: { src: "", onVideoChange: fn() },
	decorators: [withPlayerFrame, withLivePlayer],
} satisfies Meta<typeof LiveMedia>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
