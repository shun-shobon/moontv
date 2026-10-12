export function StatusMessage({ children }: { children: string }) {
	return <p className="p-8 text-center text-label text-fg-muted">{children}</p>;
}
