import { HOUR_MS } from "@moontv/core/domain/time";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { channel, program } from "../../../../.storybook/fixtures";
import { Button } from "../../../shared/components/Button";
import { ProgramCard } from "./ProgramCard";

const meta = {
	component: ProgramCard,
	args: {
		program: program(),
		channel: channel(),
		durationMs: HOUR_MS,
		status: null,
		href: "/recordings/1",
		active: false,
		action: null,
	},
	decorators: [
		(Story) => (
			<div className="max-w-sm">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ProgramCard>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Playable: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("link")).toHaveAttribute("href", "/recordings/1");
		await expect(canvas.getByText(/1時間/u)).toBeVisible();
	},
};

export const PlayableWithAction: Story = {
	args: { action: <Button variant="quiet">削除</Button> },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("link")).toBeVisible();
		await expect(canvas.getByRole("button", { name: "削除" })).toBeVisible();
	},
};

export const Active: Story = { args: { active: true } };

export const Converting: Story = {
	args: { href: null, durationMs: null, status: { label: "変換中", tone: "accent" } },
};

export const WithAction: Story = {
	args: {
		href: null,
		durationMs: null,
		status: { label: "録画中", tone: "accent" },
		action: <Button variant="quiet">録画を止める</Button>,
	},
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "録画を止める" })).toBeVisible();
	},
};

export const UnknownChannel: Story = { args: { channel: undefined } };
