import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { PlayerSettings } from "./PlayerSettings";

const meta = {
	component: PlayerSettings,
	args: {
		qualities: ["1080p", "720p", "540p", "360p"],
		codecs: ["hevc", "h264"],
		activeCodec: "hevc",
		preferences: { quality: "1080p", codec: "auto", ambient: true },
		onChange: fn(),
	},
	decorators: [
		(Story) => (
			<div className="flex h-112 max-w-md flex-col justify-end">
				<div className="flex h-10 justify-end bg-canvas/75">
					<Story />
				</div>
			</div>
		),
	],
} satisfies Meta<typeof PlayerSettings>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		await userEvent.click(canvas.getByRole("button", { name: "720p" }));
		await expect(args.onChange).toHaveBeenCalledWith({ ...args.preferences, quality: "720p" });
		await expect(canvas.queryByRole("button", { name: "720p" })).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
	},
};
