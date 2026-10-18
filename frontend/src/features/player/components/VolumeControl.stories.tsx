import type { Meta, StoryObj } from "@storybook/react-vite";

import { withLivePlayer, withPlayerFrame } from "../../../../.storybook/decorators";
import { VolumeControl } from "./VolumeControl";

const meta = {
	component: VolumeControl,
	decorators: [
		(Story) => (
			<div className="absolute inset-x-0 bottom-0 flex h-12 items-center">
				<Story />
			</div>
		),
		withPlayerFrame,
		withLivePlayer,
	],
} satisfies Meta<typeof VolumeControl>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
