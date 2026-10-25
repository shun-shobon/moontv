import type { Genre } from "@moontv/core/domain/genre";
import { GENRE_LABELS, genreOf } from "@moontv/core/domain/genre";

const CLASS_NAMES: Record<Genre, string> = {
	news: "bg-genre-news/10 border-genre-news/60",
	sports: "bg-genre-sports/10 border-genre-sports/60",
	info: "bg-genre-info/10 border-genre-info/60",
	drama: "bg-genre-drama/10 border-genre-drama/60",
	music: "bg-genre-music/10 border-genre-music/60",
	variety: "bg-genre-variety/10 border-genre-variety/60",
	movie: "bg-genre-movie/10 border-genre-movie/60",
	anime: "bg-genre-anime/10 border-genre-anime/60",
	documentary: "bg-genre-documentary/10 border-genre-documentary/60",
	theater: "bg-genre-theater/10 border-genre-theater/60",
	hobby: "bg-genre-hobby/10 border-genre-hobby/60",
	welfare: "bg-genre-welfare/10 border-genre-welfare/60",
	other: "bg-genre-other/10 border-genre-other/60",
};

export const genreStyle = (genres: readonly number[]) => {
	const genre = genreOf(genres);
	return { label: GENRE_LABELS[genre], className: CLASS_NAMES[genre] };
};
