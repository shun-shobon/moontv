import type { Meta, StoryObj } from "@storybook/react-vite";

import { AmbientGlow } from "./AmbientGlow";

/** 映像がない状態では何も描かれないことを確かめる。光は LivePlayerView で映像と一緒に見る。 */
const meta = {
	component: AmbientGlow,
	args: { video: null },
	decorators: [
		(Story) => (
			<div className="relative aspect-video max-w-3xl">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof AmbientGlow>;
export default meta;

type Story = StoryObj<typeof meta>;

export const WithoutVideo: Story = {};
