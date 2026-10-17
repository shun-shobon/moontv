import { queryOptions, useQuery } from "@tanstack/react-query";

import { fetchProgram, fetchPrograms } from "./client";

export const programsQuery = (startMs: number, endMs: number) =>
	queryOptions({
		queryKey: ["programs", startMs, endMs],
		queryFn: async () => await fetchPrograms(startMs, endMs),
	});

export const usePrograms = (startMs: number, endMs: number) =>
	useQuery(programsQuery(startMs, endMs));

export const useProgram = (id: number) =>
	useQuery({ queryKey: ["program", id], queryFn: async () => await fetchProgram(id) });
