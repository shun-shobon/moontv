import type { Meta, StoryObj } from "@storybook/react-vite";

import { InfoList } from "./InfoList";
import { SettingsSection } from "./SettingsSection";

const meta = {
	component: SettingsSection,
	args: {
		title: "サーバー",
		children: <InfoList items={[{ label: "バージョン", value: "0.1.0" }]} />,
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SettingsSection>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
