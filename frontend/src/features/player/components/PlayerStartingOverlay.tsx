export function PlayerStartingOverlay() {
	return (
		<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-video text-label text-fg-secondary transition-opacity duration-300 starting:opacity-0">
			<div className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
			チューナーを起動しています…
		</div>
	);
}
