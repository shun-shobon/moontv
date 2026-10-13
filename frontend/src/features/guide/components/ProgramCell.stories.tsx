import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { DAY_END, DAY_START, NOW, program } from "../../../../.storybook/fixtures";
import { HOUR_MS, MINUTE_MS } from "../../../shared/domain/time";
import { COLUMN_WIDTH_PX, toPx } from "../services/guide-layout";
import { ProgramCell } from "./ProgramCell";

/** 番組表の列と同じ幅で、番組の開始位置が収まる範囲だけを切り出して見せる。 */
const meta = {
	component: ProgramCell,
	args: { dayStart: DAY_START, dayEnd: DAY_END, now: NOW, onSelect: fn() },
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
