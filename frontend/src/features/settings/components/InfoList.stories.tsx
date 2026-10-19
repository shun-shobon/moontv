import type { Meta, StoryObj } from "@storybook/react-vite";

import { InfoList } from "./InfoList";

const meta = {
	component: InfoList,
	args: {
		items: [
			{ label: "バージョン", value: "0.1.0" },
			{ label: "エンコーダー", value: "VA-API" },
		],
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof InfoList>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
