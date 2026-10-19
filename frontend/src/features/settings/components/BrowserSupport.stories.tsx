import type { Meta, StoryObj } from "@storybook/react-vite";

import { BrowserSupport } from "./BrowserSupport";

const meta = {
	component: BrowserSupport,
	args: {
		support: [
			{ codec: "hevc", playable: false },
			{ codec: "h264", playable: true },
		],
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof BrowserSupport>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
