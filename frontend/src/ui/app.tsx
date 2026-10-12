import { clsx } from "clsx";

import { GuidePage } from "./guide-page";
import { LivePage } from "./live-page";
import { useRoute } from "./router";

export function App() {
	const route = useRoute();

	return (
		<div className="flex min-h-dvh flex-col bg-canvas text-fg">
			<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-6 border-b border-line bg-canvas/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
				<a href="/" className="flex items-center gap-2 text-brand">
					<img src="/icon.svg" alt="" className="size-7" />
					moontv
				</a>
				<nav className="flex gap-1 text-label">
					<NavLink href="/" active={route.name !== "guide"}>
						ライブ
					</NavLink>
					<NavLink href="/guide" active={route.name === "guide"}>
						番組表
					</NavLink>
				</nav>
			</header>
			<main className="flex min-h-0 flex-1 flex-col">
				{route.name === "guide" ? (
					<GuidePage />
				) : (
					<LivePage serviceId={route.name === "watch" ? route.serviceId : null} />
				)}
			</main>
		</div>
	);
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: string }) {
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
