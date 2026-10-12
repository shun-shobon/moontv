type GenreStyle = { label: string; className: string };

/** ARIB STD-B10 のジャンル大分類。 */
const GENRES: Record<number, GenreStyle> = {
	0: { label: "ニュース/報道", className: "bg-genre-news/10 border-genre-news/60" },
	1: { label: "スポーツ", className: "bg-genre-sports/10 border-genre-sports/60" },
	2: { label: "情報/ワイドショー", className: "bg-genre-info/10 border-genre-info/60" },
	3: { label: "ドラマ", className: "bg-genre-drama/10 border-genre-drama/60" },
	4: { label: "音楽", className: "bg-genre-music/10 border-genre-music/60" },
	5: { label: "バラエティ", className: "bg-genre-variety/10 border-genre-variety/60" },
	6: { label: "映画", className: "bg-genre-movie/10 border-genre-movie/60" },
	7: { label: "アニメ/特撮", className: "bg-genre-anime/10 border-genre-anime/60" },
	8: {
		label: "ドキュメンタリー/教養",
		className: "bg-genre-documentary/10 border-genre-documentary/60",
	},
	9: { label: "劇場/公演", className: "bg-genre-theater/10 border-genre-theater/60" },
	10: { label: "趣味/教育", className: "bg-genre-hobby/10 border-genre-hobby/60" },
	11: { label: "福祉", className: "bg-genre-welfare/10 border-genre-welfare/60" },
};

const FALLBACK: GenreStyle = {
	label: "その他",
	className: "bg-genre-other/10 border-genre-other/60",
};

export const genreStyle = (genres: readonly number[]): GenreStyle => {
	const [first] = genres;
	return first === undefined ? FALLBACK : (GENRES[first] ?? FALLBACK);
};
