import { useEffect, useState } from "react";

/** 番組の進捗表示は分単位で十分なので、描画コストを抑えて 15 秒ごとに更新する。 */
const TICK_INTERVAL_MS = 15_000;

export const useNow = (): number => {
	const [now, setNow] = useState(Date.now);

	useEffect(() => {
		const id = window.setInterval(() => {
			setNow(Date.now());
		}, TICK_INTERVAL_MS);
		return () => {
			window.clearInterval(id);
		};
	}, []);

	return now;
};
