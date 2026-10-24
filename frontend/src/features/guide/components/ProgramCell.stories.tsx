import { HOUR_MS, MINUTE_MS } from "@moontv/core/domain/time";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { DAY_END, DAY_START, NOW, program } from "../../../../.storybook/fixtures";
import { COLUMN_WIDTH_PX, toPx } from "../services/guide-layout";
import { ProgramCell } from "./ProgramCell";

/** ProgramCell は日の始まりからの位置に置かれるため、開始位置までずらして切り出す。 */
const meta = {
	component: ProgramCell,
	args: { scheduleState: null, dayStart: DAY_START, dayEnd: DAY_END, now: NOW, onSelect: fn() },
	decorators: [
		(Story, { args }) => {
			const offset = toPx(args.program.startAt - DAY_START);
			return (
				<div className="relative overflow-hidden" style={{ width: COLUMN_WIDTH_PX, height: 280 }}>
					<div className="absolute inset-x-0" style={{ top: -offset }}>
						<Story />
					</div>
				</div>
			);
		},
	],
} satisfies Meta<typeof ProgramCell>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithDescription: Story = {
	args: { program: program() },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button"));
		await expect(args.onSelect).toHaveBeenCalledWith(args.program);
	},
};

export const Short: Story = {
	args: { program: program({ duration: 10 * MINUTE_MS, name: "天気予報" }) },
};

export const Ended: Story = {
	args: { program: program({ startAt: NOW - 2 * HOUR_MS, genres: [7], name: "夕方アニメ" }) },
};

export const UnknownGenre: Story = { args: { program: program({ genres: [] }) } };

export const Scheduled: Story = {
	args: { program: program({ startAt: NOW + HOUR_MS }), scheduleState: "scheduled" },
	play: async ({ canvas }) => {
		await expect(canvas.getByText("予約")).toBeVisible();
	},
};

export const Recording: Story = {
	args: { program: program(), scheduleState: "recording" },
};
