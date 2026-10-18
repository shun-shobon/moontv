import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { NOW, program } from "../../../../.storybook/fixtures";
import { HOUR_MS } from "../../../shared/domain/time";
import { ScheduleList } from "./ScheduleList";

const meta = {
	component: ScheduleList,
	args: {
		schedules: [
			{ state: "recording", program: program() },
			{
				state: "scheduled",
				program: program({ startAt: NOW + HOUR_MS, name: "ドラマ「月の裏側」", genres: [3] }),
			},
			{
				state: "failed",
				program: program({ startAt: NOW - 3 * HOUR_MS, name: "朝の情報番組" }),
			},
		],
		channelNames: new Map([[1024, "テレビ総合"]]),
		pendingId: null,
		failedId: null,
		onCancel: fn(),
	},
} satisfies Meta<typeof ScheduleList>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "取り消す" }));
		await expect(args.onCancel).toHaveBeenCalledWith(args.schedules[1]?.program.id);
		await expect(canvas.getByRole("button", { name: "録画を止める" })).toBeVisible();
		await expect(canvas.getAllByRole("button")).toHaveLength(2);
	},
};

export const CancelFailed: Story = {
	args: { failedId: meta.args.schedules[1]?.program.id ?? null },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("alert")).toHaveTextContent("変更できませんでした");
	},
};

export const Empty: Story = { args: { schedules: [] } };
