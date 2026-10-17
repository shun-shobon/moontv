import * as v from "valibot";

import { startOfBroadcastDay } from "../domain/time";

const ServiceIdSchema = v.pipe(v.string(), v.digits(), v.transform(Number));

/** パスの `:serviceId` を数値にする。形が不正なら null。 */
export const parseServiceId = (param: unknown): number | null => {
	const parsed = v.safeParse(ServiceIdSchema, param);
	return parsed.success ? parsed.output : null;
};

export const watchPath = (serviceId: number) => `/watch/${serviceId}`;

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/u;

const pad = (n: number) => String(n).padStart(2, "0");

/** 放送日を、その開始時刻が属する暦日の `YYYY-MM-DD` で表す。 */
const toDateParam = (dayStart: number) => {
	const date = new Date(dayStart);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const guidePath = (dayStart: number) => `/guide?date=${toDateParam(dayStart)}`;

/** `?date=` を放送日の開始時刻にする。形が不正か、存在しない日付なら null。 */
export const parseGuideDate = (param: string | null): number | null => {
	if (param == null || !DATE_PARAM.test(param)) {
		return null;
	}
	const dayStart = startOfBroadcastDay(new Date(`${param}T12:00`).getTime());
	// 2月31日のような日付は別の日に繰り上がるので、書き戻して確かめる。
	return Number.isNaN(dayStart) || toDateParam(dayStart) !== param ? null : dayStart;
};
