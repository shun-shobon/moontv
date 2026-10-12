import * as v from "valibot";

import { ProgramSchema } from "../../../shared/api/schemas";

export const ProgramDetailSchema = v.object({
	...ProgramSchema.entries,
	extended: v.array(v.object({ key: v.string(), value: v.string() })),
});
export type ProgramDetail = v.InferOutput<typeof ProgramDetailSchema>;
