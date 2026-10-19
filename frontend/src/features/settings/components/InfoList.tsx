type Props = { items: readonly { label: string; value: string }[] };

export function InfoList({ items }: Props) {
	return (
		<dl className="divide-y divide-line">
			{items.map(({ label, value }) => (
				<div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
					<dt className="text-label text-fg-secondary">{label}</dt>
					<dd className="text-right text-label text-fg tabular-nums">{value}</dd>
				</div>
			))}
		</dl>
	);
}
