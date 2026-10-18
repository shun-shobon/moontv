import { useState } from "react";

import { Button } from "../../../shared/components/Button";

type Props = {
	isPending: boolean;
	failed: boolean;
	onDelete: () => void;
};

/** 録画は消すと戻せないので、押すと確認のボタンに変わる。 */
export function DeleteRecordingButton({ isPending, failed, onDelete }: Props) {
	const [confirming, setConfirming] = useState(false);

	return (
		<div className="flex flex-wrap items-center gap-1">
			{confirming ? (
				<>
					<Button
						variant="quiet"
						onPress={() => {
							setConfirming(false);
						}}
					>
						やめる
					</Button>
					<Button variant="primary" isPending={isPending} onPress={onDelete}>
						削除する
					</Button>
				</>
			) : (
				<Button
					variant="quiet"
					onPress={() => {
						setConfirming(true);
					}}
				>
					削除
				</Button>
			)}
			{failed && (
				<p role="alert" className="px-2 text-caption text-fg-muted">
					削除できませんでした
				</p>
			)}
		</div>
	);
}
