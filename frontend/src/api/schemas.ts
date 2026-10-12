import * as v from "valibot";

export const CodecSchema = v.picklist(["hevc", "h264"]);
export type Codec = v.InferOutput<typeof CodecSchema>;

export const QualitySchema = v.picklist(["1080p", "720p", "540p", "360p"]);
export type Quality = v.InferOutput<typeof QualitySchema>;

export const StatusSchema = v.object({
	version: v.string(),
	encoder: v.string(),
	codecs: v.array(CodecSchema),
	qualities: v.array(QualitySchema),
});
export type Status = v.InferOutput<typeof StatusSchema>;

export const ProgramSchema = v.object({
	id: v.number(),
	serviceId: v.number(),
	startAt: v.number(),
	duration: v.nullable(v.number()),
	name: v.string(),
	description: v.string(),
	genres: v.array(v.number()),
	isFree: v.boolean(),
});
export type Program = v.InferOutput<typeof ProgramSchema>;

export const ProgramDetailSchema = v.object({
	...ProgramSchema.entries,
	extended: v.array(v.object({ key: v.string(), value: v.string() })),
});

export const ChannelSchema = v.object({
	id: v.number(),
	name: v.string(),
	channelType: v.string(),
	channel: v.string(),
	remoteControlKeyId: v.nullable(v.number()),
	hasLogo: v.boolean(),
	isSubchannel: v.boolean(),
	present: v.nullable(ProgramSchema),
	following: v.nullable(ProgramSchema),
});
export type Channel = v.InferOutput<typeof ChannelSchema>;

export const ErrorBodySchema = v.object({ error: v.string() });
