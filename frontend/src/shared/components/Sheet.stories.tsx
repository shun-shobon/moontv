import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dialog, Heading } from "react-aria-components";
import { expect, fn, screen, waitFor } from "storybook/test";

import { Sheet } from "./Sheet";

const meta = {
	component: Sheet,
	args: {
		isOpen: true,
		blurBackdrop: true,
		onOpenChange: fn(),
		children: (
			<Dialog className="flex flex-col gap-2 p-6 pt-1 outline-none sm:pt-6">
				<Heading slot="title" className="text-title">
					番組の詳細
				</Heading>
				<p className="text-body text-fg-secondary">国内外の最新ニュースと天気をお伝えします。</p>
			</Dialog>
		),
	},
} satisfies Meta<typeof Sheet>;
export default meta;

type Story = StoryObj<typeof meta>;

// シートは body 直下に描かれるので、canvas ではなく screen から探す。
export const Default: Story = {
	play: async () => {
		const dialog = await screen.findByRole("dialog", { name: "番組の詳細" });
		await waitFor(() => expect(dialog).toBeVisible());
	},
};

export const DismissWithEscape: Story = {
	play: async ({ args, userEvent }) => {
		await screen.findByRole("dialog");
		await userEvent.keyboard("{Escape}");
		await expect(args.onOpenChange).toHaveBeenCalledWith(false);
	},
};
