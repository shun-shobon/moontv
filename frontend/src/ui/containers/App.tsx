import { AppHeader } from "../components/AppHeader";
import { GuidePage } from "./GuidePage";
import { useRoute } from "./hooks/useRoute";
import { LivePage } from "./LivePage";

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
