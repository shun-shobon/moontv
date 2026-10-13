import type { Meta, StoryObj } from "@storybook/react-vite";

import { PlayerPlaceholder } from "./PlayerPlaceholder";

const meta = {
	component: PlayerPlaceholder,
	decorators: [
		(Story) => (
			<div className="max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof PlayerPlaceholder>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
