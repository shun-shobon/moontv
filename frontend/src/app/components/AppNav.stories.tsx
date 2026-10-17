import type { Meta, StoryObj } from "@storybook/react-vite";

import { AppNav } from "./AppNav";

const meta = {
	component: AppNav,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AppNav>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { section: "live" } };

export const Guide: Story = { args: { section: "guide" } };

export const NoSection: Story = { args: { section: null } };
