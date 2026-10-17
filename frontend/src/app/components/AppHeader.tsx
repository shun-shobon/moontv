import { NavLink } from "./NavLink";

export type Section = "live" | "guide";

/** section が null のときは、どのナビゲーションも選択中にしない。404 ページなどで使う。 */
type Props = { section: Section | null };

export function AppHeader({ section }: Props) {
	return (
		<header className="sticky top-0 z-40 box-content flex h-14 shrink-0 items-center gap-6 border-b border-line bg-canvas/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
			<a href="/" className="flex items-center gap-2 text-brand">
				<img src="/icon.svg" alt="" className="size-7" />
				moontv
			</a>
			<nav className="flex gap-1 text-label">
				<NavLink href="/" active={section === "live"}>
					ライブ
				</NavLink>
				<NavLink href="/guide" active={section === "guide"}>
					番組表
				</NavLink>
			</nav>
		</header>
	);
}
