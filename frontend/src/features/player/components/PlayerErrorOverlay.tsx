type Props = { message: string; onRetry: () => void };

export function PlayerErrorOverlay({ message, onRetry }: Props) {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-video/80 p-6 text-center text-label text-fg">
			<p>{message}</p>
			<button
				type="button"
				className="rounded-md bg-accent px-4 py-2 text-action text-on-accent hover:bg-accent-hover"
				onClick={onRetry}
			>
				再読み込み
			</button>
		</div>
	);
}
