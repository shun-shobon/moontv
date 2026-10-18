import type { Meta, StoryObj } from "@storybook/react-vite";

import { program } from "../../../../.storybook/fixtures";
import { HOUR_MS } from "../../../shared/domain/time";
import { RecordingDetail } from "./RecordingDetail";

const meta = {
	component: RecordingDetail,
	args: {
		recording: { program: program(), state: "ready", error: null, durationMs: HOUR_MS },
		channelName: "テレビ総合",
	},
} satisfies Meta<typeof RecordingDetail>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
