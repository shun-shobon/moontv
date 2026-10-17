import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { withLivePlayer } from "../../../../.storybook/decorators";
import { LivePlayerView } from "./LivePlayerView";

const meta = {
	component: LivePlayerView,
	args: {
		phase: { kind: "starting" },
		sourceKey: "1024/hevc/1080p/0",
		src: "",
		settings: {
			qualities: ["1080p", "720p", "540p", "360p"],
			codecs: ["hevc", "h264"],
			activeCodec: "hevc",
			preferences: { quality: "1080p", codec: "auto", ambient: true },
			onChange: fn(),
			audios: [],
			audio: "main",
			onAudioChange: fn(),
		},
		onMediaError: fn(),
		onRetry: fn(),
	},
	decorators: [withLivePlayer],
} satisfies Meta<typeof LivePlayerView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Starting: Story = {};

export const Failed: Story = {
	args: { phase: { kind: "error", message: "再生が中断されました" } },
};
