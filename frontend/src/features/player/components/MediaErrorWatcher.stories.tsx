import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { withLivePlayer } from "../../../../.storybook/decorators";
import { MediaErrorWatcher } from "./MediaErrorWatcher";

/** 何も描かない部品なので、エラーがない間は通知しないことだけを確かめる。 */
const meta = {
	component: MediaErrorWatcher,
	args: { onError: fn() },
	decorators: [withLivePlayer],
} satisfies Meta<typeof MediaErrorWatcher>;
export default meta;

type Story = StoryObj<typeof meta>;

export const NoError: Story = {
	play: async ({ args }) => {
		await expect(args.onError).not.toHaveBeenCalled();
	},
};
