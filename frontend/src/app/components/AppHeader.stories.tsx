import type { Meta, StoryObj } from "@storybook/react-vite";

import { AppHeader } from "./AppHeader";

const meta = {
	component: AppHeader,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppHeader>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { section: "live" } };

export const Guide: Story = { args: { section: "guide" } };
