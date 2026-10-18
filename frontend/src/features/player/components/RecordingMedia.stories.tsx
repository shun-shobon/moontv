import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { withPlayerFrame, withVideoPlayer } from "../../../../.storybook/decorators";
import { RecordingMedia } from "./RecordingMedia";

/** Storybook には録画を配るサーバーがないため、src に HLS の URL を入れたときだけ映像が出る。 */
const meta = {
	component: RecordingMedia,
	args: { src: "", showCaption: true, onVideoChange: fn() },
	decorators: [withPlayerFrame, withVideoPlayer],
} satisfies Meta<typeof RecordingMedia>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
