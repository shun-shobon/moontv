import { NavLink } from "./NavLink";

export type Section = "live" | "guide";

/** section が null のときは、どのナビゲーションも選択中にしない。404 ページなどで使う。 */
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

/** 狭い画面では下端のボトムバー、md 以上では左端のサイドバーになる。 */
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
		</nav>
	);
}
