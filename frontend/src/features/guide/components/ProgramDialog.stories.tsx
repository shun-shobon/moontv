import { HOUR_MS } from "@moontv/core/domain/time";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";

import { NOW, channel, program } from "../../../../.storybook/fixtures";
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
		reservation: { state: null, isPending: false, failed: false, onChange: fn() },
		now: NOW,
		isOpen: true,
		onOpenChange: fn(),
	},
} satisfies Meta<typeof ProgramDialog>;
export default meta;

type Story = StoryObj<typeof meta>;

// ダイアログは body 直下に描かれるので、canvas ではなく screen から探す。出てくるアニメーションの間は透明なので waitFor で待つ。
export const OnAir: Story = {
	play: async ({ args, userEvent }) => {
		const dialog = await screen.findByRole("dialog", { name: args.program.name });
		await waitFor(() => expect(dialog).toBeVisible());
		await expect(screen.getByRole("link", { name: "視聴する" })).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "閉じる" }));
		await expect(args.onOpenChange).toHaveBeenCalledWith(false);
	},
};

export const Upcoming: Story = {
	args: { program: program({ startAt: NOW + HOUR_MS }) },
	play: async () => {
		await screen.findByRole("dialog");
		await expect(screen.queryByRole("link", { name: "視聴する" })).not.toBeInTheDocument();
	},
};

export const Reserve: Story = {
	args: { program: program({ startAt: NOW + HOUR_MS }) },
	play: async ({ args, userEvent }) => {
		await screen.findByRole("dialog");
		await userEvent.click(screen.getByRole("button", { name: "録画予約" }));
		await expect(args.reservation?.onChange).toHaveBeenCalledWith(true);
	},
};

export const Scheduled: Story = {
	args: {
		program: program({ startAt: NOW + HOUR_MS }),
		reservation: { state: "scheduled", isPending: false, failed: false, onChange: fn() },
	},
	play: async ({ args, userEvent }) => {
		await screen.findByRole("dialog");
		await waitFor(() => expect(screen.getByText("録画予約済み")).toBeVisible());
		await userEvent.click(screen.getByRole("button", { name: "予約を取り消す" }));
		await expect(args.reservation?.onChange).toHaveBeenCalledWith(false);
	},
};

export const Recording: Story = {
	args: { reservation: { state: "recording", isPending: false, failed: false, onChange: fn() } },
	play: async () => {
		await screen.findByRole("dialog");
		await waitFor(() => expect(screen.getByRole("button", { name: "録画を止める" })).toBeVisible());
	},
};

export const ReservationFailed: Story = {
	args: {
		program: program({ startAt: NOW + HOUR_MS }),
		reservation: { state: null, isPending: false, failed: true, onChange: fn() },
	},
	play: async () => {
		await screen.findByRole("dialog");
		await expect(screen.getByRole("alert")).toHaveTextContent("録画予約を変更できませんでした");
	},
};

export const RecordingDisabled: Story = {
	args: { reservation: null },
	play: async () => {
		await screen.findByRole("dialog");
		await expect(screen.queryByRole("button", { name: "録画予約" })).not.toBeInTheDocument();
	},
};

export const LoadingDetail: Story = { args: { extended: undefined } };

export const DismissWithEscape: Story = {
	play: async ({ args, userEvent }) => {
		await screen.findByRole("dialog");
		await userEvent.keyboard("{Escape}");
		await expect(args.onOpenChange).toHaveBeenCalledWith(false);
	},
};

export const LongDetail: Story = {
	args: {
		extended: Array.from({ length: 12 }, (_, i) => ({
			key: `項目${i + 1}`,
			value:
				"番組の詳しい説明がここに入ります。\n複数行にわたる長い説明でも、ボタンは下に残ります。",
		})),
	},
	play: async () => {
		await screen.findByRole("dialog");
		await waitFor(() => {
			const { bottom } = screen.getByRole("button", { name: "閉じる" }).getBoundingClientRect();
			return expect(bottom).toBeLessThanOrEqual(window.innerHeight);
		});
	},
};
