import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { SegmentedControl } from "./SegmentedControl";

const meta = {
	component: SegmentedControl<string>,
	args: {
		label: "放送波",
		options: ["地デジ", "BS", "CS"],
		value: "BS",
		format: (v: string) => v,
		onChange: fn(),
		className: "flex gap-1",
	},
} satisfies Meta<typeof SegmentedControl<string>>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await expect(canvas.getByRole("radio", { name: "BS" })).toBeChecked();
		await userEvent.click(canvas.getByRole("radio", { name: "CS" }));
		await expect(args.onChange).toHaveBeenCalledWith("CS");
	},
};

export const ReselectDoesNothing: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("radio", { name: "BS" }));
		await expect(args.onChange).not.toHaveBeenCalled();
	},
};

export const NoSelection: Story = { args: { value: undefined } };
