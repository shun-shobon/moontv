import type { Meta, StoryObj } from "@storybook/react-vite";

import { NavLink } from "./NavLink";

const meta = {
	component: NavLink,
	args: { href: "/", children: "ライブ" },
} satisfies Meta<typeof NavLink>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { active: true } };

export const Inactive: Story = { args: { active: false } };
