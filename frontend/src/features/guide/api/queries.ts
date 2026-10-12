import { useQuery } from "@tanstack/react-query";

import { fetchProgram, fetchPrograms } from "./client";

export const usePrograms = (startMs: number, endMs: number) =>
	useQuery({
		queryKey: ["programs", startMs, endMs],
		queryFn: async () => await fetchPrograms(startMs, endMs),
	});

export const useProgram = (id: number) =>
	useQuery({ queryKey: ["program", id], queryFn: async () => await fetchProgram(id) });
