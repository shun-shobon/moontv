import type { Meta, StoryObj } from "@storybook/react-vite";

import { withLivePlayer, withPlayerFrame } from "../../../../.storybook/decorators";
import type { CaptionRun, CaptionSnapshot } from "../services/captions";
import { CaptionTimeline } from "../services/captions";
import { CaptionOverlay } from "./CaptionOverlay";

const video = { currentTime: 0, videoWidth: 1920, videoHeight: 1080 };

const run = (overrides: Partial<CaptionRun>): CaptionRun => ({
	x: 0,
	y: 0,
	cellWidth: 40,
	cellHeight: 60,
	fontWidth: 36,
	fontHeight: 36,
	text: "",
	fg: "#ffffffff",
	bg: "#00000080",
	flash: false,
	underline: false,
	highlight: 0,
	...overrides,
});

/** 右向きの矢印を 4 階調で描いた外字。 */
const arrow = Array.from({ length: 36 * 36 }, (_, i) => {
	const [x, y] = [i % 36, Math.floor(i / 36)];
	const shaft = y >= 15 && y < 21 && x >= 4 && x < 24;
	const head = x >= 22 && x < 32 && Math.abs(y - 18) <= 31 - x;
	return shaft || head ? "3" : "0";
}).join("");

const snapshot = (
	runs: CaptionRun[],
	bitmaps: CaptionSnapshot["bitmaps"] = {},
): CaptionSnapshot => ({
	plane: [960, 540],
	runs,
	bitmaps,
});

const empty = snapshot([]);

const timelineOf = (caption: CaptionSnapshot, superimpose = empty) => {
	const timeline = new CaptionTimeline();
	timeline.add(0, { seq: 1, caption, superimpose });
	return timeline;
};

const meta = {
	component: CaptionOverlay,
	args: { video, showCaption: true, timeline: timelineOf(empty) },
	decorators: [withPlayerFrame, withLivePlayer],
} satisfies Meta<typeof CaptionOverlay>;
export default meta;

type Story = StoryObj<typeof meta>;

/** 半透明の背景、話者ごとの色、中型（半角）の英数を並べた、放送でよく見る形。 */
export const Caption: Story = {
	args: {
		timeline: timelineOf(
			snapshot([
				run({ x: 138, y: 329, text: "字幕の表示を", fg: "#ffff00ff" }),
				run({ x: 378, y: 329, cellWidth: 20, fontWidth: 18, text: " " }),
				run({ x: 398, y: 329, text: "確かめます", fg: "#ffff00ff" }),
				run({ x: 138, y: 389, text: "（", fg: "#00ffffff" }),
				run({ x: 178, y: 389, cellWidth: 20, fontWidth: 18, text: "ABC 123", fg: "#00ffffff" }),
				run({ x: 318, y: 389, text: "）", fg: "#00ffffff" }),
			]),
		),
	},
};

/** 縁取り（ORN）と透明な背景、外字のビットマップ。 */
export const OutlineAndBitmap: Story = {
	args: {
		timeline: timelineOf(
			snapshot(
				[
					run({ x: 170, y: 386, bg: "#00000000", edge: "#000000ff", text: "縁取りの文字" }),
					run({ x: 410, y: 386, bg: "#00000000", edge: "#000000ff", bitmap: "arrow" }),
				],
				{ arrow: { width: 36, height: 36, levels: 4, pixels: arrow } },
			),
		),
	},
};

/** 下線と囲み（HLC）。 */
export const UnderlineAndHighlight: Story = {
	args: {
		timeline: timelineOf(
			snapshot([
				run({ x: 200, y: 200, underline: true, text: "下線" }),
				run({ x: 400, y: 200, highlight: 0b1111, text: "囲" }),
			]),
		),
	},
};

/** ARIB の追加記号。端末によっては絵文字になる字も、同梱のフォントで文字として描く。 */
export const AdditionalSymbols: Story = {
	args: {
		timeline: timelineOf(
			snapshot([
				run({ x: 138, y: 329, text: "🈑🈓🈞🈡⛔⚡☔♨❗⭕", bg: "#00000000", edge: "#000000ff" }),
				run({ x: 138, y: 389, text: "㊙🅿㉑⑴Ⅻ㍻㎡⅓（亂價圖）" }),
				// 92区56〜60点の楽器の略号 (vn) (ob) (cb) (ce|mb)。Unicode の私用領域に割り当てている。
				run({ x: 138, y: 449, text: "⛩⛽⛅⅒⟐\uE2A5\uE2A6\uE2A7\uE2A8\uE2A9" }),
			]),
		),
	},
};

/** 字幕を消しても文字スーパーは出す。 */
export const SuperimposeOnly: Story = {
	args: {
		showCaption: false,
		timeline: timelineOf(
			snapshot([run({ x: 138, y: 329, text: "表示されない字幕" })]),
			snapshot([run({ x: 40, y: 40, bg: "#0000ffff", text: "文字スーパー" })]),
		),
	},
};
