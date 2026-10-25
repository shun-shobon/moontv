const pad = (n: number) => String(n).padStart(2, "0");

/** 再生位置を「12:34」、1時間を超えたら「1:02:03」のように表す。 */
export const formatPlaybackTime = (ms: number) => {
	const total = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};
