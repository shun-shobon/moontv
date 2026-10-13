import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";

import { NOW, channel, program } from "../../../../.storybook/fixtures";
import { HOUR_MS } from "../../../shared/domain/time";
import { ProgramDialog } from "./ProgramDialog";

const meta = {
	component: ProgramDialog,
	args: {
		program: program(),
		channel: channel(),
		extended: [
			{ key: "番組内容", value: "きょうの主なニュース\n・各地の天気\n・スポーツ" },
			{ key: "出演者", value: "【キャスター】月野 太郎\n【気象予報士】星川 花子" },
		],
		now: NOW,
		onClose: fn(),
	},
} satisfies Meta<typeof ProgramDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

export const OnAir: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await expect(canvas.getByRole("link", { name: "視聴する" })).toBeVisible();
		await userEvent.click(canvas.getByRole("button", { name: "閉じる" }));
		await waitFor(() => expect(args.onClose).toHaveBeenCalled());
	},
};

export const Upcoming: Story = {
	args: { program: program({ startAt: NOW + HOUR_MS }) },
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole("link", { name: "視聴する" })).not.toBeInTheDocument();
	},
};

export const LoadingDetail: Story = { args: { extended: undefined } };
