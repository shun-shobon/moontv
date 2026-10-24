import * as v from "valibot";

import {
	ChannelSchema,
	ErrorBodySchema,
	LiveEndSchema,
	ProgramDetailSchema,
	ProgramSchema,
	RecordingSchema,
	ScheduleSchema,
	StatusSchema,
	TunerSchema,
} from "./schemas";
import type { LiveTarget } from "./urls";
import { apiUrl, livePath } from "./urls";

class ApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

async function request(path: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(apiUrl(path), init);
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

export const fetchTuners = async () => await getJson("/api/tuners", v.array(TunerSchema));

export const fetchPrograms = async (startMs: number, endMs: number) =>
	await getJson(`/api/programs?start=${startMs}&end=${endMs}`, v.array(ProgramSchema));

export const fetchProgram = async (id: number) =>
	await getJson(`/api/programs/${id}`, ProgramDetailSchema);

export const fetchSchedules = async () =>
	await getJson("/api/recording/schedules", v.array(ScheduleSchema));

export async function addSchedule(programId: number): Promise<void> {
	await request(`/api/recording/schedules/${programId}`, { method: "PUT" });
}

export async function removeSchedule(programId: number): Promise<void> {
	await request(`/api/recording/schedules/${programId}`, { method: "DELETE" });
}

export const fetchRecordings = async () =>
	await getJson("/api/recordings", v.array(RecordingSchema));

export const fetchRecording = async (programId: number) =>
	await getJson(`/api/recordings/${programId}`, RecordingSchema);

export async function deleteRecording(programId: number): Promise<void> {
	await request(`/api/recordings/${programId}`, { method: "DELETE" });
}

export async function startLive(target: LiveTarget, signal: AbortSignal): Promise<void> {
	await request(livePath(target), { method: "PUT", signal });
}

export async function fetchLiveEnd(target: LiveTarget) {
	return await getJson(livePath(target), LiveEndSchema);
}

/** ページを閉じる途中でも届くよう keepalive で送る。 */
export function leaveLive(target: LiveTarget): void {
	void fetch(apiUrl(livePath(target)), { method: "DELETE", keepalive: true }).catch(() => {
		// 届かなくてもサーバー側が無視聴タイムアウトでセッションを止める。
	});
}
