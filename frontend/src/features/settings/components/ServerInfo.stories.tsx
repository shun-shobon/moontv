import type { Meta, StoryObj } from "@storybook/react-vite";

import { ServerInfo } from "./ServerInfo";

const meta = {
	component: ServerInfo,
	args: {
		status: {
			version: "0.1.0",
			encoder: "vaapi",
			codecs: ["hevc", "h264"],
			qualities: ["1080p", "720p", "540p", "360p"],
			recording: true,
			library: false,
		},
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ServerInfo>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
