import type { ReactNode } from "react";

type Props = { title: string; children: ReactNode };

export function SettingsSection({ title, children }: Props) {
	return (
		<section className="flex flex-col gap-2">
			<h2 className="px-1 text-heading text-fg-secondary">{title}</h2>
			<div className="rounded-xl bg-surface ring-1 ring-line ring-inset">{children}</div>
		</section>
	);
}
