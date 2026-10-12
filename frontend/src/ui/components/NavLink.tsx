import { clsx } from "clsx";

type Props = { href: string; active: boolean; children: string };

export function NavLink({ href, active, children }: Props) {
	return (
		<a
			href={href}
			className={clsx(
				"rounded-md px-3 py-1.5 transition-colors",
				active ? "bg-selected text-fg" : "text-fg-muted hover:text-fg",
			)}
		>
			{children}
		</a>
	);
}
