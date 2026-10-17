import type { Meta, StoryObj } from "@storybook/react-vite";

import { NavLink } from "./NavLink";

const meta = {
	component: NavLink,
	args: {
		href: "/",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
				<rect x="3" y="6.5" width="18" height="13.5" rx="3" />
			</svg>
		),
		children: "ライブ",
	},
} satisfies Meta<typeof NavLink>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Active: Story = { args: { active: true } };

export const Inactive: Story = { args: { active: false } };
