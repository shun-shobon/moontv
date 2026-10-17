import * as v from "valibot";

const ServiceIdSchema = v.pipe(v.string(), v.digits(), v.transform(Number));

/** パスの `:serviceId` を数値にする。形が不正なら null。 */
export const parseServiceId = (param: unknown): number | null => {
	const parsed = v.safeParse(ServiceIdSchema, param);
	return parsed.success ? parsed.output : null;
};

export const watchPath = (serviceId: number) => `/watch/${serviceId}`;
