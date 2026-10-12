import { useSyncExternalStore } from "react";

import type { Route } from "../../../shared/services/routes";
import { resolveRoute } from "../../../shared/services/routes";

const subscribe = (onChange: () => void) => {
	navigation.addEventListener("currententrychange", onChange);
	return () => {
		navigation.removeEventListener("currententrychange", onChange);
	};
};

const getPath = () => new URL(navigation.currentEntry?.url ?? window.location.href).pathname;

export const useRoute = (): Route => resolveRoute(useSyncExternalStore(subscribe, getPath));
