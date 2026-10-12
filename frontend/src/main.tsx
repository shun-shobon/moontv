import "./index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./ui/app";
import { interceptNavigations } from "./ui/router";

const queryClient = new QueryClient({
	defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true } },
});

interceptNavigations();

const root = document.querySelector("#root");
if (root == null) {
	throw new Error("Root element is missing.");
}

createRoot(root).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
);
