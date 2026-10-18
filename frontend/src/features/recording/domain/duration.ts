import { HOUR_MS, MINUTE_MS } from "../../../shared/domain/time";

/** 録画の長さを「1時間5分」のように分単位で表す。放送の前後にずれる数秒で番組の長さと食い違わないよう、四捨五入する。 */
export const formatDuration = (ms: number) => {
	const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
	const hours = Math.floor((minutes * MINUTE_MS) / HOUR_MS);
	const rest = minutes % 60;
	if (hours === 0) {
		return `${rest}分`;
	}
	return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
};
