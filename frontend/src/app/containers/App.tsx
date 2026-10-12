import { GuidePage } from "../../features/guide/containers/GuidePage";
import { LivePage } from "../../features/live/containers/LivePage";
import { AppHeader } from "../components/AppHeader";
import { useRoute } from "./hooks/useRoute";

export function App() {
	const route = useRoute();

	return (
		<div className="flex min-h-dvh flex-col bg-canvas text-fg">
			<AppHeader section={route.name === "guide" ? "guide" : "live"} />
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
