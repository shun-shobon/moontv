import { clsx } from "clsx";

/**
 * チャンネルや番組を並べるカードの見た目を、ライブと録画で揃える。並べ方は使う側で決める。
 * `self` はカード自体がリンク、`link` は中にリンクとボタンが並び、リンクに合わせてカード全体を反応させる。
 */
export const cardClassName = ({
	active,
	press,
}: {
	active: boolean;
	press: "self" | "link" | "none";
}) =>
	clsx(
		"rounded-xl p-3 ring-1 ring-inset",
		press !== "none" && "transition duration-200 ease-out",
		press === "self" && "focus-ring data-pressed:scale-[0.98]",
		// リンクは中身の一部だけなので、キーボードで選んだときの枠はカード全体に出す。
		press === "link" &&
			"relative outline-2 outline-offset-2 outline-transparent has-[a[data-focus-visible]]:outline-fg-accent has-[a[data-pressed]]:scale-[0.98]",
		active ? "bg-selected ring-fg-accent/40" : "bg-surface ring-line",
		!active && press === "self" && "data-hovered:bg-surface-hover",
		!active && press === "link" && "has-[a[data-hovered]]:bg-surface-hover",
	);
