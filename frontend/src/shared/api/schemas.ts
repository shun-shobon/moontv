import * as v from "valibot";

export const CodecSchema = v.picklist(["hevc", "h264"]);
export type Codec = v.InferOutput<typeof CodecSchema>;

export const QualitySchema = v.picklist(["1080p", "720p", "540p", "360p"]);
export type Quality = v.InferOutput<typeof QualitySchema>;

export const AudioTrackSchema = v.picklist(["main", "sub"]);
export type AudioTrack = v.InferOutput<typeof AudioTrackSchema>;

export const AudioSchema = v.object({
	track: AudioTrackSchema,
	lang: v.nullable(v.string()),
});
export type Audio = v.InferOutput<typeof AudioSchema>;

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
	/** 番組名から取り出した「字幕」「再放送」などの属性。 */
	marks: v.array(v.string()),
	description: v.string(),
	genres: v.array(v.number()),
	isFree: v.boolean(),
	audios: v.array(AudioSchema),
});
export type Program = v.InferOutput<typeof ProgramSchema>;

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
