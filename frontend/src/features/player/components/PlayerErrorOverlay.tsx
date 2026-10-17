import { Button } from "../../../shared/components/Button";

type Props = { message: string; onRetry: () => void };

export function PlayerErrorOverlay({ message, onRetry }: Props) {
	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-video/80 p-6 text-center text-label text-fg transition-opacity duration-300 starting:opacity-0">
			<p>{message}</p>
			<Button variant="primary" onPress={onRetry}>
				再読み込み
			</Button>
		</div>
	);
}
