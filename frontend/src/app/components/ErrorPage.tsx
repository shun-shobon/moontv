import { Button } from "../../shared/components/Button";

type Props = { onReload: () => void };

export function ErrorPage({ onReload }: Props) {
	return (
		<div className="flex flex-col items-center gap-4 p-8 text-center">
			<h1 className="text-title text-fg">ページを表示できません</h1>
			<p className="text-body text-fg-muted">
				サーバーに接続できないか、画面の表示中に問題が起きました。moontv と mirakc
				が起動しているか確認してください。
			</p>
			<Button variant="primary" onPress={onReload}>
				再読み込み
			</Button>
		</div>
	);
}
