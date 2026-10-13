import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusMessage } from "./StatusMessage";

const meta = {
	component: StatusMessage,
} satisfies Meta<typeof StatusMessage>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "チャンネルを読み込んでいます…" } };
