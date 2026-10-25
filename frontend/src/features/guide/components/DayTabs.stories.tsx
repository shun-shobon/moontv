import { selectableDays } from "@moontv/core/services/guide";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { DAY_START } from "../../../../.storybook/fixtures";
import { DayTabs } from "./DayTabs";

const days = selectableDays(DAY_START);

const meta = {
	component: DayTabs,
	args: { days, current: DAY_START, onSelect: fn() },
} satisfies Meta<typeof DayTabs>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		const [, second] = canvas.getAllByRole("radio");
		await userEvent.click(second!);
		await expect(args.onSelect).toHaveBeenCalledWith(days[1]);
	},
};
