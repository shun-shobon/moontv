import { useEffect, useState } from "react";

const TICK_MS = 15_000;

export const useNow = () => {
	const [now, setNow] = useState(Date.now);
	useEffect(() => {
		const id = setInterval(() => {
			setNow(Date.now());
		}, TICK_MS);
		return () => {
			clearInterval(id);
		};
	}, []);
	return now;
};
