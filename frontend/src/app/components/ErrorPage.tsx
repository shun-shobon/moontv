type Props = { onReload: () => void };

export function ErrorPage({ onReload }: Props) {
	return (
		<div className="flex flex-col items-center gap-4 p-8 text-center">
			<h1 className="text-title text-fg">ページを表示できません</h1>
			<p className="text-body text-fg-muted">
				サーバーに接続できないか、画面の表示中に問題が起きました。moontv と mirakc
				が起動しているか確認してください。
			</p>
			<button
				type="button"
				className="rounded-md bg-accent px-4 py-2 text-action text-on-accent hover:bg-accent-hover"
				onClick={onReload}
			>
				再読み込み
			</button>
		</div>
	);
}
