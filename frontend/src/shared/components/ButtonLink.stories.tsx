import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { ButtonLink } from "./ButtonLink";

const meta = {
	component: ButtonLink,
	args: { href: "/", children: "チャンネル一覧へ" },
} satisfies Meta<typeof ButtonLink>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
	args: { variant: "primary" },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("link", { name: "チャンネル一覧へ" })).toHaveAttribute(
			"href",
			"/",
		);
	},
};

export const Quiet: Story = { args: { variant: "quiet" } };
