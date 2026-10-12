import * as v from "valibot";

import type { Codec, Quality } from "./schemas";
import {
	ChannelSchema,
	ErrorBodySchema,
	ProgramDetailSchema,
	ProgramSchema,
	StatusSchema,
} from "./schemas";

class ApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

async function request(path: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(path, init);
	if (res.ok) {
		return res;
	}

	const body: unknown = await res.json().catch(() => null);
	const parsed = v.safeParse(ErrorBodySchema, body);
	const message = parsed.success
		? parsed.output.error
		: `Request failed with status ${res.status}.`;
	throw new ApiError(message, res.status);
}

async function getJson<T extends v.GenericSchema>(
	path: string,
	schema: T,
): Promise<v.InferOutput<T>> {
	const res = await request(path);
	const body: unknown = await res.json();
	return v.parse(schema, body);
}

export const fetchStatus = async () => await getJson("/api/status", StatusSchema);

export const fetchChannels = async () => await getJson("/api/channels", v.array(ChannelSchema));

export const fetchPrograms = async (startMs: number, endMs: number) =>
	await getJson(`/api/programs?start=${startMs}&end=${endMs}`, v.array(ProgramSchema));

export const fetchProgram = async (id: number) =>
	await getJson(`/api/programs/${id}`, ProgramDetailSchema);

export const logoUrl = (serviceId: number) => `/api/channels/${serviceId}/logo`;

export type LiveTarget = {
	serviceId: number;
	codec: Codec;
	quality: Quality;
	viewerId: string;
};

const liveBase = ({ serviceId, codec, quality, viewerId }: LiveTarget) =>
	`/api/live/${serviceId}/${codec}/${quality}/${viewerId}`;

export const masterPlaylistUrl = (target: LiveTarget) => `${liveBase(target)}/master.m3u8`;

/** チューナーの確保と最初のセグメント生成を待つ。失敗理由はサーバーのメッセージで返る。 */
export async function startLive(target: LiveTarget, signal: AbortSignal): Promise<void> {
	await request(liveBase(target), { method: "PUT", signal });
}

/** ページを閉じる途中でも届くよう keepalive で送る。 */
export function leaveLive(target: LiveTarget): void {
	void fetch(liveBase(target), { method: "DELETE", keepalive: true }).catch(() => {
		// 届かなくてもサーバー側が無視聴タイムアウトでセッションを止める。
	});
}
