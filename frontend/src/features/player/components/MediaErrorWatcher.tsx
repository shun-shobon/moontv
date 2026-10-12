import { usePlayer } from "@videojs/react/live-video";
import { useEffect } from "react";

export function MediaErrorWatcher({ onError }: { onError: () => void }) {
	const error = usePlayer((state) => state.error);

	useEffect(() => {
		if (error != null) {
			onError();
		}
	}, [error, onError]);

	return null;
}
