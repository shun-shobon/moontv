import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { PlaybackSettings } from "./PlaybackSettings";

const meta = {
	component: PlaybackSettings,
	args: {
		qualities: ["1080p", "720p", "540p", "360p"],
		codecs: ["hevc", "h264"],
		autoCodec: "hevc",
		preferences: { quality: "1080p", codec: "auto", ambient: true, captions: false },
		isDefault: true,
		onChange: fn(),
		onReset: fn(),
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PlaybackSettings>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("radio", { name: "自動 (HEVC)" })).toBeChecked();
		await expect(canvas.getByRole("button", { name: "初期値に戻す" })).toBeDisabled();
	},
};

export const SelectQuality: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("radio", { name: "720p" }));
		await expect(args.onChange).toHaveBeenCalledWith({ ...args.preferences, quality: "720p" });
	},
};

export const ToggleCaptions: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("switch", { name: "字幕" }));
		await expect(args.onChange).toHaveBeenCalledWith({ ...args.preferences, captions: true });
	},
};

export const Reset: Story = {
	args: {
		preferences: { quality: "540p", codec: "h264", ambient: false, captions: true },
		isDefault: false,
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "初期値に戻す" }));
		await expect(args.onReset).toHaveBeenCalled();
	},
};

/** HEVC を再生できないブラウザーでは選ばせない。 */
export const H264Only: Story = {
	args: { codecs: ["h264"], autoCodec: "h264" },
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole("radio", { name: "HEVC" })).not.toBeInTheDocument();
	},
};
