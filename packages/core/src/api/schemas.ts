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
	/** mirakc で録画を有効にしているか。 */
	recording: v.boolean(),
	/** 録画を変換して一覧にする設定があるか。 */
	library: v.boolean(),
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

export const ScheduleStateSchema = v.picklist(["scheduled", "recording", "finished", "failed"]);
export type ScheduleState = v.InferOutput<typeof ScheduleStateSchema>;

export const ScheduleSchema = v.object({
	state: ScheduleStateSchema,
	program: ProgramSchema,
});
export type Schedule = v.InferOutput<typeof ScheduleSchema>;

export const ProgramDetailSchema = v.object({
	...ProgramSchema.entries,
	extended: v.array(v.object({ key: v.string(), value: v.string() })),
});
export type ProgramDetail = v.InferOutput<typeof ProgramDetailSchema>;

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

export const LiveEndSchema = v.object({
	/** 視聴者が止めたのではない視聴の終わり方。チューナーを別の視聴に譲ったか、録画に使われている。 */
	reason: v.nullable(v.picklist(["evicted", "recording"])),
});
export type EndReason = NonNullable<v.InferOutput<typeof LiveEndSchema>["reason"]>;
