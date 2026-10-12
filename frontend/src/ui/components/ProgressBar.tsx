/** progress は 0〜1 の割合。 */
export function ProgressBar({ progress }: { progress: number }) {
	return (
		<div className="h-1 overflow-hidden rounded-full bg-track">
			<div className="h-full bg-accent-strong" style={{ width: `${progress * 100}%` }} />
		</div>
	);
}
