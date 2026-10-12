import * as v from "valibot";

import { getJson } from "../../../shared/api/client";
import { ProgramSchema } from "../../../shared/api/schemas";
import { ProgramDetailSchema } from "./schemas";

export const fetchPrograms = async (startMs: number, endMs: number) =>
	await getJson(`/api/programs?start=${startMs}&end=${endMs}`, v.array(ProgramSchema));

export const fetchProgram = async (id: number) =>
	await getJson(`/api/programs/${id}`, ProgramDetailSchema);
