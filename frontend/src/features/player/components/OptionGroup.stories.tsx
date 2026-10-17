import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "react-aria-components";
import { expect, fn } from "storybook/test";

import { OptionGroup } from "./OptionGroup";

const meta = {
	component: OptionGroup<string>,
	args: {
		label: "画質",
		options: ["1080p", "720p", "540p", "360p"],
		value: "720p",
		format: (q: string) => q,
		onSelect: fn(),
	},
	decorators: [
		(Story) => (
			<Menu
				aria-label="再生設定"
				className="flex w-56 flex-col rounded-xl bg-overlay/90 p-1.5 text-label"
			>
				<Story />
			</Menu>
		),
	],
} satisfies Meta<typeof OptionGroup<string>>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await expect(canvas.getByRole("menuitemradio", { name: "720p" })).toBeChecked();
		await userEvent.click(canvas.getByRole("menuitemradio", { name: "360p" }));
		await expect(args.onSelect).toHaveBeenCalledWith("360p");
	},
};

export const ArrowKeysDoNotSelect: Story = {
	play: async ({ args, canvas, userEvent }) => {
		canvas.getByRole("menuitemradio", { name: "720p" }).focus();
		await userEvent.keyboard("{ArrowDown}");
		await expect(canvas.getByRole("menuitemradio", { name: "540p" })).toHaveFocus();
		await expect(args.onSelect).not.toHaveBeenCalled();
	},
};
