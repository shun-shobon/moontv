import { clsx } from "clsx";

/** チャンネルや番組を並べるカードの見た目を、ライブと録画で揃える。 */
export const cardClassName = ({ active, interactive }: { active: boolean; interactive: boolean }) =>
	clsx(
		"flex flex-col gap-2 rounded-xl p-3 ring-1 ring-inset",
		interactive && "focus-ring transition duration-200 ease-out data-pressed:scale-[0.98]",
		active && "bg-selected ring-accent/40",
		!active && "bg-surface ring-line",
		!active && interactive && "data-hovered:bg-surface-hover",
	);
