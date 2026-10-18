import * as v from "valibot";

export const LiveEndSchema = v.object({
	/** 視聴者が止めたのではない視聴の終わり方。チューナーを別の視聴に譲ったか、録画に使われている。 */
	reason: v.nullable(v.picklist(["evicted", "recording"])),
});
export type EndReason = NonNullable<v.InferOutput<typeof LiveEndSchema>["reason"]>;
