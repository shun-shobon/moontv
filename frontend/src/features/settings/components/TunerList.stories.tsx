import type { Meta, StoryObj } from "@storybook/react-vite";

import { CHANNELS, program } from "../../../../.storybook/fixtures";
import { TunerList } from "./TunerList";

const meta = {
	component: TunerList,
	args: {
		channelById: new Map(CHANNELS.map((c) => [c.id, c])),
		tuners: [
			{
				index: 0,
				name: "PX-MLT8PE #1",
				types: ["GR"],
				users: [
					{
						id: "192.0.2.1:50000",
						kind: "live",
						serviceId: 1024,
						codec: "hevc",
						quality: "1080p",
						audio: "main",
						viewers: 2,
					},
					{
						id: "192.0.2.1:50002",
						kind: "live",
						serviceId: 1024,
						codec: "h264",
						quality: "720p",
						audio: "sub",
						viewers: 1,
					},
				],
			},
			{
				index: 1,
				name: "PX-MLT8PE #2",
				types: ["BS", "CS"],
				users: [
					{
						id: "recorder:program#1",
						kind: "recording",
						program: program({ serviceId: 101, name: "映画「星の海」" }),
					},
				],
			},
			{
				index: 2,
				name: "PX-MLT8PE #3",
				types: ["GR"],
				users: [{ id: "job:update-schedules", kind: "epg" }],
			},
			{
				index: 3,
				name: "PX-MLT8PE #4",
				types: ["BS", "CS"],
				users: [{ id: "192.0.2.9:41000", kind: "other", name: "EPGStation/2.10.0" }],
			},
			{ index: 4, name: "PX-MLT8PE #5", types: ["GR"], users: [] },
		],
	},
	decorators: [
		(Story) => (
			<div className="max-w-3xl rounded-xl bg-surface">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof TunerList>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { tuners: [] } };
