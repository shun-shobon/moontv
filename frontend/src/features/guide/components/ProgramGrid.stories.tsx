import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { CHANNELS, DAY_END, DAY_START, NOW, dayPrograms } from "../../../../.storybook/fixtures";
import { DAY_MS } from "../../../shared/domain/time";
import { ProgramGrid } from "./ProgramGrid";

const channels = CHANNELS.filter((c) => !c.isSubchannel);

const meta = {
	component: ProgramGrid,
	args: {
		channels,
		programs: dayPrograms(channels),
		dayStart: DAY_START,
		dayEnd: DAY_END,
		now: NOW,
		onSelect: fn(),
	},
	parameters: { layout: "fullscreen" },
	decorators: [
		(Story) => (
			<div className="h-dvh overflow-auto">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ProgramGrid>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Today: Story = {};

export const Tomorrow: Story = {
	args: { dayStart: DAY_START + DAY_MS, dayEnd: DAY_END + DAY_MS, programs: [] },
};
