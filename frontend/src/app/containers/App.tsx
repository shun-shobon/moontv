import { useSyncExternalStore } from "react";

import { AppNav } from "../components/AppNav";
import type { Store } from "../services/store";
import { PageErrorBoundary } from "./PageErrorBoundary";
import type { Screen } from "./screens";
import { ERROR_PAGE } from "./screens";

export function App({ screens }: { screens: Store<Screen> }) {
	const { section, page } = useSyncExternalStore(screens.subscribe, screens.get);

	return (
		<div className="flex min-h-dvh flex-col bg-canvas text-fg [--nav-height:calc(3.5rem+env(safe-area-inset-bottom))] [--page-height:calc(100dvh-env(safe-area-inset-top)-var(--nav-height))] md:flex-row md:[--nav-height:0px]">
			<AppNav section={section} />
			<main className="flex min-w-0 flex-1 flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-(--nav-height) max-md:pl-[env(safe-area-inset-left)]">
				<PageErrorBoundary page={page} fallback={ERROR_PAGE} />
			</main>
		</div>
	);
}
