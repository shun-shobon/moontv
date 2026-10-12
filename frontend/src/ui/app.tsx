import { GuidePage } from "./guide-page";
import { LivePage } from "./live-page";
import { useRoute } from "./router";

export function App() {
	const route = useRoute();

	return (
		<div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
			<header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-6 border-b border-zinc-800/80 bg-zinc-950/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
				<a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
					<img src="/favicon.svg" alt="" className="size-7" />
					moontv
				</a>
				<nav className="flex gap-1 text-sm">
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
	const state = active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-100";
	return (
		<a href={href} className={`rounded-md px-3 py-1.5 transition-colors ${state}`}>
			{children}
		</a>
	);
}
