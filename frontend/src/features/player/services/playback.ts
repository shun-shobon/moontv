/**
 * 一時停止中にライブの最新位置から遅れた分を、再生再開時に取り戻す。
 * seekable の終端は再生可能な最新位置で、通常の再生でも 2〜3 秒後ろを再生しているため、それを超えた遅れだけを対象にする。
 */
const LIVE_EDGE_TOLERANCE_SECONDS = 3;

/** iOS は全画面を閉じた直後に動画を一時停止するが、その pause は全画面の終了通知より後に届くことがある。 */
const FULLSCREEN_EXIT_RESUME_WINDOW_MS = 2_000;

type Seekable = { readonly length: number; end: (index: number) => number };

/** 最新位置から遅れすぎていれば移動先を返す。 */
export const liveEdgeSeekTarget = (seekable: Seekable, currentTime: number): number | null => {
	if (seekable.length === 0) {
		return null;
	}
	const liveEdge = seekable.end(seekable.length - 1);
	return liveEdge - currentTime > LIVE_EDGE_TOLERANCE_SECONDS ? liveEdge : null;
};

export const isCausedByFullscreenExit = (pausedAt: number, fullscreenExitedAt: number) =>
	pausedAt - fullscreenExitedAt < FULLSCREEN_EXIT_RESUME_WINDOW_MS;
