import { MINUTE_MS } from "@moontv/core/domain/time";

const DP_PER_MINUTE = 2.4;
export const COLUMN_WIDTH = 164;
export const TIME_COLUMN_WIDTH = 40;
export const HEADER_HEIGHT = 40;
/** これより低い枠に説明文を入れても1行も読めない。 */
const DESCRIPTION_MIN_HEIGHT = 64;

export const toDp = (ms: number) => (ms / MINUTE_MS) * DP_PER_MINUTE;

export const toMs = (dp: number) => (dp / DP_PER_MINUTE) * MINUTE_MS;

export const showsDescription = (height: number) => height >= DESCRIPTION_MIN_HEIGHT;
