import * as v from "valibot";

import {
	AudioTrackSchema,
	CodecSchema,
	ProgramSchema,
	QualitySchema,
} from "../../../shared/api/schemas";

/** `id` は mirakc が振る利用者の ID で、チューナーの中で一意。 */
export const TunerUserSchema = v.variant("kind", [
	v.object({
		id: v.string(),
		kind: v.literal("live"),
		serviceId: v.number(),
		codec: CodecSchema,
		quality: QualitySchema,
		audio: AudioTrackSchema,
		viewers: v.number(),
	}),
	/** 番組情報が手元に無ければ null。 */
	v.object({ id: v.string(), kind: v.literal("recording"), program: v.nullable(ProgramSchema) }),
	v.object({ id: v.string(), kind: v.literal("epg") }),
	/** moontv 以外のクライアント。`name` は User-Agent か接続元。 */
	v.object({ id: v.string(), kind: v.literal("other"), name: v.string() }),
]);
export type TunerUser = v.InferOutput<typeof TunerUserSchema>;

export const TunerSchema = v.object({
	index: v.number(),
	name: v.string(),
	types: v.array(v.string()),
	users: v.array(TunerUserSchema),
});
export type Tuner = v.InferOutput<typeof TunerSchema>;
