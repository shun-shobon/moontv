import { NavLink } from "./NavLink";

export type Section = "live" | "guide" | "recording" | "settings";

type Props = { section: Section | null };

const LIVE_ICON = (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
		<path d="m8.5 3 3.5 3.5L15.5 3" strokeLinecap="round" strokeLinejoin="round" />
		<rect x="3" y="6.5" width="18" height="13.5" rx="3" />
	</svg>
);

const GUIDE_ICON = (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
		<rect x="3" y="4" width="18" height="16" rx="3" />
		<path d="M3 9h18M9 9v11M15 9v11" />
	</svg>
);

const RECORDING_ICON = (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
		<circle cx="12" cy="12" r="8.5" />
		<circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
	</svg>
);

const SETTINGS_ICON = (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
		<path d="M4 7h9M17 7h3M4 17h3M11 17h9" strokeLinecap="round" />
		<circle cx="15" cy="7" r="2.5" />
		<circle cx="9" cy="17" r="2.5" />
	</svg>
);

export function AppNav({ section }: Props) {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-nav flex h-(--nav-height) border-t border-line bg-canvas/90 px-[max(env(safe-area-inset-left),env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] backdrop-blur md:sticky md:top-0 md:h-dvh md:w-[calc(5rem+env(safe-area-inset-left))] md:shrink-0 md:flex-col md:items-center md:gap-2 md:border-t-0 md:border-r md:pt-[calc(env(safe-area-inset-top)+0.75rem)] md:pr-0 md:pb-0 md:pl-[env(safe-area-inset-left)] md:backdrop-blur-none">
			<a href="/" className="hidden md:mb-2 md:block" aria-label="moontv">
				<img src="/icon.svg" alt="" className="size-9" />
			</a>
			<NavLink href="/" active={section === "live"} icon={LIVE_ICON}>
				ライブ
			</NavLink>
			<NavLink href="/guide" active={section === "guide"} icon={GUIDE_ICON}>
				番組表
			</NavLink>
			<NavLink href="/recordings" active={section === "recording"} icon={RECORDING_ICON}>
				録画
			</NavLink>
			{/* 日々使う画面と分けるため、PC では下端に置く。 */}
			<div className="flex flex-1 md:mt-auto md:mb-3 md:w-full md:flex-none">
				<NavLink href="/settings" active={section === "settings"} icon={SETTINGS_ICON}>
					設定
				</NavLink>
			</div>
		</nav>
	);
}
