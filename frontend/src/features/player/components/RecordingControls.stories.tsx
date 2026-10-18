import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { withPlayerFrame, withVideoPlayer } from "../../../../.storybook/decorators";
import { RecordingControls } from "./RecordingControls";

const meta = {
	component: RecordingControls,
	args: { captions: false, onCaptionsChange: fn() },
	decorators: [withPlayerFrame, withVideoPlayer],
} satisfies Meta<typeof RecordingControls>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "字幕" }));
		await expect(args.onCaptionsChange).toHaveBeenCalledWith(true);
	},
};

export const CaptionsOn: Story = { args: { captions: true } };
