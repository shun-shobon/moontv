import { useSyncExternalStore } from "react";

import type { Route } from "../../services/routes";
import { resolveRoute } from "../../services/routes";

const subscribe = (onChange: () => void) => {
	navigation.addEventListener("currententrychange", onChange);
	return () => {
		navigation.removeEventListener("currententrychange", onChange);
	};
};

const getPath = () => new URL(navigation.currentEntry?.url ?? window.location.href).pathname;

export const useRoute = (): Route => resolveRoute(useSyncExternalStore(subscribe, getPath));
