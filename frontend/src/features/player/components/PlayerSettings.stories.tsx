import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";

import { withLivePlayer } from "../../../../.storybook/decorators";
import { PlayerSettings } from "./PlayerSettings";

const meta = {
	component: PlayerSettings,
	args: {
		qualities: ["1080p", "720p", "540p", "360p"],
		codecs: ["hevc", "h264"],
		activeCodec: "hevc",
		preferences: { quality: "1080p", codec: "auto", ambient: true },
		onChange: fn(),
		audios: [],
		audio: "main",
		onAudioChange: fn(),
	},
	decorators: [
		(Story) => (
			<div className="flex h-112 max-w-md flex-col justify-end">
				<div className="flex h-10 justify-end bg-canvas/75">
					<Story />
				</div>
			</div>
		),
		withLivePlayer,
	],
} satisfies Meta<typeof PlayerSettings>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

// メニューは body 直下に描かれるので、canvas ではなく screen から探す。出てくるアニメーションの間は透明なので waitFor で待つ。
export const SelectQuality: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		await userEvent.click(await screen.findByRole("menuitemradio", { name: "720p" }));
		await expect(args.onChange).toHaveBeenCalledWith({ ...args.preferences, quality: "720p" });
		await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
	},
};

export const ToggleKeepsMenuOpen: Story = {
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		await userEvent.click(
			await screen.findByRole("menuitemcheckbox", { name: "アンビエントモード" }),
		);
		await expect(args.onChange).toHaveBeenCalledWith({ ...args.preferences, ambient: false });
		await waitFor(() => expect(screen.getByRole("menu")).toBeVisible());
	},
};

export const Open: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		const menu = await screen.findByRole("menu");
		await waitFor(() => expect(menu).toBeVisible());
	},
};

export const SelectAudio: Story = {
	args: {
		audios: [
			{ track: "main", lang: "jpn" },
			{ track: "sub", lang: "eng" },
		],
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		await userEvent.click(await screen.findByRole("menuitemradio", { name: "副音声（英語）" }));
		await expect(args.onAudioChange).toHaveBeenCalledWith("sub");
	},
};

export const HidesAudioWithASingleTrack: Story = {
	args: { audios: [{ track: "main", lang: "jpn" }] },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "再生設定" }));
		await screen.findByRole("menu");
		await expect(screen.queryByText("音声")).not.toBeInTheDocument();
	},
};
