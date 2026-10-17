import { clsx } from "clsx";
import type { ReactNode } from "react";

type Props = { href: string; active: boolean; icon: ReactNode; children: string };

export function NavLink({ href, active, icon, children }: Props) {
	return (
		<a
			href={href}
			aria-current={active ? "page" : undefined}
			className={clsx(
				"group flex flex-1 flex-col items-center justify-center gap-0.5 text-label transition-colors md:w-full md:flex-none md:py-1.5",
				active ? "text-fg" : "text-fg-muted hover:text-fg",
			)}
		>
			<span
				className={clsx(
					"flex h-7 w-14 items-center justify-center rounded-full transition-colors *:size-5",
					active ? "bg-selected" : "group-hover:bg-surface-hover",
				)}
			>
				{icon}
			</span>
			{children}
		</a>
	);
}
