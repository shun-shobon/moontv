import * as v from "valibot";

import { ProgramSchema } from "../../../shared/api/schemas";

export const RecordingStateSchema = v.picklist(["recording", "converting", "ready", "failed"]);
export type RecordingState = v.InferOutput<typeof RecordingStateSchema>;

export const RecordingSchema = v.object({
	program: ProgramSchema,
	state: RecordingStateSchema,
	/** 変換に失敗した理由。 */
	error: v.nullable(v.string()),
	durationMs: v.nullable(v.number()),
});
export type Recording = v.InferOutput<typeof RecordingSchema>;
