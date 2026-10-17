import { useSyncExternalStore } from "react";

import { AppHeader } from "../components/AppHeader";
import type { Store } from "../services/store";
import { PageErrorBoundary } from "./PageErrorBoundary";
import type { Screen } from "./screens";
import { ERROR_PAGE } from "./screens";

export function App({ screens }: { screens: Store<Screen> }) {
	const { section, page } = useSyncExternalStore(screens.subscribe, screens.get);

	return (
		<div className="flex min-h-dvh flex-col bg-canvas text-fg">
			<AppHeader section={section} />
			<main className="flex min-h-0 flex-1 flex-col">
				<PageErrorBoundary page={page} fallback={ERROR_PAGE} />
			</main>
		</div>
	);
}
