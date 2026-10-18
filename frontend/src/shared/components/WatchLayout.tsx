import type { ReactNode } from "react";

type Props = { player: ReactNode; info: ReactNode; aside: ReactNode };

/** 視聴画面の配置。広い画面では右に一覧を置き、1列ではプレイヤーを上端に固定する。 */
export function WatchLayout({ player, info, aside }: Props) {
	return (
		// 1列のときにプレイヤーをページの終わりまで固定するため、プレイヤーを grid の直下に置く。
		<div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:grid-rows-[auto_1fr] lg:p-4">
			{/* 横向きのスマホでは 16:9 が画面の高さを超え、固定すると下の内容が見えなくなるので、高さに収めて縦向きだけ固定する。 */}
			<div className="z-player mx-auto w-full min-w-0 max-lg:portrait:sticky max-lg:portrait:top-[env(safe-area-inset-top)] landscape:max-w-[calc((var(--page-height)-env(safe-area-inset-bottom))*16/9)]">
				{player}
			</div>
			<div className="flex min-w-0 flex-col gap-4 px-4 lg:px-0">{info}</div>
			<aside className="px-4 pb-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(var(--page-height)-2rem)] lg:overflow-y-auto lg:px-0 lg:pb-0">
				{aside}
			</aside>
		</div>
	);
}
