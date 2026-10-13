import type { Meta, StoryObj } from "@storybook/react-vite";

import { PlayerStartingOverlay } from "./PlayerStartingOverlay";

const meta = {
	component: PlayerStartingOverlay,
	decorators: [
		(Story) => (
			<div className="relative aspect-video max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PlayerStartingOverlay>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
