import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { DeleteRecordingButton } from "./DeleteRecordingButton";

const meta = {
	component: DeleteRecordingButton,
	args: { isPending: false, failed: false, onDelete: fn() },
} satisfies Meta<typeof DeleteRecordingButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "削除" }));
		await expect(args.onDelete).not.toHaveBeenCalled();
		await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
		await expect(args.onDelete).toHaveBeenCalled();
	},
};

export const Cancel: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "削除" }));
		await userEvent.click(canvas.getByRole("button", { name: "やめる" }));
		await expect(canvas.getByRole("button", { name: "削除" })).toBeVisible();
	},
};

export const Failed: Story = {
	args: { failed: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("alert")).toHaveTextContent("削除できませんでした");
	},
};
