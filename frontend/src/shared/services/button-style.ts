import { clsx } from "clsx";

export type ButtonVariant = "primary" | "quiet";

/** 押す操作とリンクで見た目を揃えるため、Button と ButtonLink で共有する。 */
export const buttonClassName = (variant: ButtonVariant) =>
	clsx(
		"inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-action focus-ring transition duration-150 ease-out data-pressed:scale-96",
		variant === "primary"
			? "bg-accent text-on-accent data-hovered:bg-accent-hover"
			: "text-fg-secondary data-hovered:bg-surface-hover data-hovered:text-fg",
	);
