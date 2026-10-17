import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { withLivePlayer, withPlayerFrame } from "../../../../.storybook/decorators";
import { PlayerControls } from "./PlayerControls";

const meta = {
	component: PlayerControls,
	args: {
		settings: {
			qualities: ["1080p", "720p", "540p", "360p"],
			codecs: ["hevc", "h264"],
			activeCodec: "h264",
			preferences: { quality: "720p", codec: "h264", ambient: false, captions: false },
			onChange: fn(),
			audios: [],
			audio: "main",
			onAudioChange: fn(),
		},
	},
	decorators: [withPlayerFrame, withLivePlayer],
} satisfies Meta<typeof PlayerControls>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
