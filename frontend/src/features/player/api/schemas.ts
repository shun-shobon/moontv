import * as v from "valibot";

export const LiveEndSchema = v.object({
	/** チューナーが足りず、後から来た別チャンネルの視聴に譲るために止められた。 */
	evicted: v.boolean(),
});
