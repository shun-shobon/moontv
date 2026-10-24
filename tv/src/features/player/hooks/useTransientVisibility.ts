import { useCallback, useEffect, useState } from "react";

/** 表示してから一定時間で消える。`resetKey` が変わったときも出し直す。 */
export const useTransientVisibility = (durationMs: number, resetKey: unknown) => {
	const [shown, setShown] = useState(0);
	const [hidden, setHidden] = useState<{ key: unknown; shown: number } | null>(null);
	const visible = hidden == null || hidden.key !== resetKey || hidden.shown !== shown;

	useEffect(() => {
		const timer = setTimeout(() => {
			setHidden({ key: resetKey, shown });
		}, durationMs);
		return () => {
			clearTimeout(timer);
		};
	}, [durationMs, resetKey, shown]);

	const show = useCallback(() => {
		setShown((n) => n + 1);
	}, []);

	return [visible, show] as const;
};
