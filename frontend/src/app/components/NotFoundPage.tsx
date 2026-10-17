import { ButtonLink } from "../../shared/components/ButtonLink";

export function NotFoundPage() {
	return (
		<div className="flex flex-col items-center gap-4 p-8 text-center">
			<h1 className="text-title text-fg">ページが見つかりません</h1>
			<p className="text-body text-fg-muted">
				URL が間違っているか、チャンネルがなくなった可能性があります。
			</p>
			<ButtonLink variant="primary" href="/">
				チャンネル一覧へ
			</ButtonLink>
		</div>
	);
}
