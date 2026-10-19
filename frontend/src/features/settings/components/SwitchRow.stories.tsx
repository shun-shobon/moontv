import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { SwitchRow } from "./SwitchRow";

const meta = {
	component: SwitchRow,
	args: {
		label: "字幕",
		description: "字幕と文字スーパーを映像に重ねます。",
		checked: false,
		onChange: fn(),
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SwitchRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {
	play: async ({ args, canvas }) => {
		await expect(canvas.getByRole("switch", { name: "字幕" })).toHaveAccessibleDescription(
			"字幕と文字スーパーを映像に重ねます。",
		);
		await expect(args.onChange).not.toHaveBeenCalled();
	},
};

export const On: Story = { args: { checked: true } };

export const ToggleByRow: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByText("字幕と文字スーパーを映像に重ねます。"));
		await expect(args.onChange).toHaveBeenCalledWith(true);
	},
};
