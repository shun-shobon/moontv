import type { Meta, StoryObj } from "@storybook/react-vite";

import { WatchLayout } from "./WatchLayout";

const block = (label: string, className: string) => (
	<div
		className={`flex items-center justify-center rounded-xl bg-surface text-label text-fg-muted ${className}`}
	>
		{label}
	</div>
);

const meta = {
	component: WatchLayout,
	args: {
		player: block("プレイヤー", "aspect-video bg-video"),
		info: block("番組の情報", "h-32"),
		aside: block("一覧", "h-96"),
	},
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WatchLayout>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
