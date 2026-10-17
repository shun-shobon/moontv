import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Link } from "react-aria-components";

type Props = { href: string; active: boolean; icon: ReactNode; children: string };

export function NavLink({ href, active, icon, children }: Props) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={clsx(
				"group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-label focus-ring transition-colors md:w-full md:flex-none md:py-1.5",
				active ? "text-fg" : "text-fg-muted data-hovered:text-fg",
			)}
		>
			<span className="relative flex h-7 w-14 items-center justify-center transition-transform duration-150 group-data-pressed:scale-90">
				<span
					className={clsx(
						"absolute inset-0 rounded-full transition duration-300 ease-out",
						active
							? "bg-selected ring-1 ring-line-strong ring-inset"
							: "scale-x-50 opacity-0 group-data-hovered:scale-x-100 group-data-hovered:bg-surface-hover group-data-hovered:opacity-100",
					)}
				/>
				<span className={clsx("relative flex transition-colors *:size-5", active && "text-accent")}>
					{icon}
				</span>
			</span>
			{children}
		</Link>
	);
}
