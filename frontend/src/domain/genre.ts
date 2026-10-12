type GenreStyle = { label: string; className: string };

/** ARIB STD-B10 のジャンル大分類。 */
const GENRES: Record<number, GenreStyle> = {
	0: { label: "ニュース/報道", className: "bg-sky-950/80 border-sky-700" },
	1: { label: "スポーツ", className: "bg-emerald-950/80 border-emerald-700" },
	2: { label: "情報/ワイドショー", className: "bg-cyan-950/80 border-cyan-700" },
	3: { label: "ドラマ", className: "bg-rose-950/80 border-rose-700" },
	4: { label: "音楽", className: "bg-fuchsia-950/80 border-fuchsia-700" },
	5: { label: "バラエティ", className: "bg-amber-950/80 border-amber-700" },
	6: { label: "映画", className: "bg-red-950/80 border-red-700" },
	7: { label: "アニメ/特撮", className: "bg-pink-950/80 border-pink-700" },
	8: { label: "ドキュメンタリー/教養", className: "bg-indigo-950/80 border-indigo-700" },
	9: { label: "劇場/公演", className: "bg-violet-950/80 border-violet-700" },
	10: { label: "趣味/教育", className: "bg-lime-950/80 border-lime-700" },
	11: { label: "福祉", className: "bg-teal-950/80 border-teal-700" },
};

const FALLBACK: GenreStyle = { label: "その他", className: "bg-zinc-900 border-zinc-700" };

export const genreStyle = (genres: readonly number[]): GenreStyle => {
	const [first] = genres;
	return first === undefined ? FALLBACK : (GENRES[first] ?? FALLBACK);
};
