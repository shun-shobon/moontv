import type { Meta, StoryObj } from "@storybook/react-vite";

import { withPlayerFrame, withVideoPlayer } from "../../../../.storybook/decorators";
import { PlaybackIndicators } from "./PlaybackIndicators";

/** 操作したときにだけ出るので、何もしなければ何も描かれない。 */
const meta = {
	component: PlaybackIndicators,
	decorators: [withPlayerFrame, withVideoPlayer],
} satisfies Meta<typeof PlaybackIndicators>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
