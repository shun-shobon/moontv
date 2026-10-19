import type { Meta, StoryObj } from "@storybook/react-vite";

import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { SettingRow } from "./SettingRow";

const meta = {
	component: SettingRow,
	args: {
		label: "画質",
		description: "映像が途切れるときや通信量を抑えたいときは下げてください。",
		children: (
			<SegmentedControl
				label="画質"
				options={["1080p", "720p"]}
				value="1080p"
				format={(q) => q}
				onChange={() => {}}
				className="flex gap-1"
			/>
		),
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof SettingRow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutDescription: Story = { args: { description: undefined } };
