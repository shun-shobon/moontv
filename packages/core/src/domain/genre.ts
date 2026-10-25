/** ARIB STD-B10 のジャンル大分類（0〜11）の並び。 */
const GENRES = [
	"news",
	"sports",
	"info",
	"drama",
	"music",
	"variety",
	"movie",
	"anime",
	"documentary",
	"theater",
	"hobby",
	"welfare",
] as const;

export type Genre = (typeof GENRES)[number] | "other";

export const GENRE_LABELS: Record<Genre, string> = {
	news: "ニュース/報道",
	sports: "スポーツ",
	info: "情報/ワイドショー",
	drama: "ドラマ",
	music: "音楽",
	variety: "バラエティ",
	movie: "映画",
	anime: "アニメ/特撮",
	documentary: "ドキュメンタリー/教養",
	theater: "劇場/公演",
	hobby: "趣味/教育",
	welfare: "福祉",
	other: "その他",
};

/** 番組の色分けには先頭のジャンルを使う。 */
export const genreOf = (genres: readonly number[]): Genre => {
	const [first] = genres;
	return (first === undefined ? undefined : GENRES[first]) ?? "other";
};
