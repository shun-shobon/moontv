import type { Meta, StoryObj } from "@storybook/react-vite";

import { withLivePlayer, withPlayerFrame } from "../../../../.storybook/decorators";
import { CenterPlayButton } from "./CenterPlayButton";

/** メディアがない間は一時停止扱いなので、ボタンが表示される。 */
const meta = {
	component: CenterPlayButton,
	decorators: [withPlayerFrame, withLivePlayer],
} satisfies Meta<typeof CenterPlayButton>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Paused: Story = {};
