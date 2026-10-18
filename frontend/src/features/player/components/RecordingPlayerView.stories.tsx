import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { withVideoPlayer } from "../../../../.storybook/decorators";
import { RecordingPlayerView } from "./RecordingPlayerView";

const meta = {
	component: RecordingPlayerView,
	args: {
		src: "",
		captions: false,
		onCaptionsChange: fn(),
		ambient: false,
		failed: false,
		onMediaError: fn(),
		onRetry: fn(),
	},
	decorators: [withVideoPlayer],
} satisfies Meta<typeof RecordingPlayerView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Failed: Story = { args: { failed: true } };
