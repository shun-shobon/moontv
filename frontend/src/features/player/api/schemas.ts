import * as v from "valibot";

export const LiveEndSchema = v.object({
	evicted: v.boolean(),
});
