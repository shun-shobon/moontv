import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { NOW, program } from "../../../../.storybook/fixtures";
import { HOUR_MS } from "../../../shared/domain/time";
import { RecordingList } from "./RecordingList";

const ready = { program: program(), state: "ready", error: null, durationMs: HOUR_MS } as const;

const meta = {
	component: RecordingList,
	args: {
		recordings: [
			{
				program: program({ startAt: NOW - HOUR_MS, name: "ドラマ「月の裏側」", genres: [3] }),
				state: "converting",
				error: null,
				durationMs: null,
			},
			ready,
			{
				program: program({ startAt: NOW - 5 * HOUR_MS, name: "朝の情報番組" }),
				state: "failed",
				error: "ffmpeg exited with exit status: 1",
				durationMs: null,
			},
		],
		channelNames: new Map([[1024, "テレビ総合"]]),
		confirmingId: null,
		deletingId: null,
		failedId: null,
		onDeleteRequest: fn(),
		onDelete: fn(),
	},
} satisfies Meta<typeof RecordingList>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await expect(canvas.getByText("1時間")).toBeVisible();
		await expect(canvas.getByRole("link", { name: "再生" })).toHaveAttribute(
			"href",
			`/recordings/${ready.program.id}`,
		);
		await expect(canvas.getByText("変換中")).toBeVisible();
		// 変換中の録画は消せない。
		await expect(canvas.getAllByRole("button", { name: "削除" })).toHaveLength(2);
		await userEvent.click(canvas.getAllByRole("button", { name: "削除" })[0]!);
		await expect(args.onDeleteRequest).toHaveBeenCalledWith(ready.program.id);
	},
};

export const Confirming: Story = {
	args: { confirmingId: ready.program.id },
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "削除する" }));
		await expect(args.onDelete).toHaveBeenCalledWith(ready.program.id);
		await userEvent.click(canvas.getByRole("button", { name: "やめる" }));
		await expect(args.onDeleteRequest).toHaveBeenCalledWith(null);
	},
};

export const DeleteFailed: Story = {
	args: { failedId: ready.program.id },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("alert")).toHaveTextContent("削除できませんでした");
	},
};

export const Empty: Story = { args: { recordings: [] } };
