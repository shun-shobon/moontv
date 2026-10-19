import type { ReactNode } from "react";

type Props = {
	label: string;
	description?: string;
	/** 右に置く操作。スマホ幅では説明の下に回す。 */
	children: ReactNode;
};

export function SettingRow({ label, description, children }: Props) {
	return (
		<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-label text-fg">{label}</span>
				{description != null && <p className="text-caption text-fg-muted">{description}</p>}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}
