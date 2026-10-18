import * as v from "valibot";

import { ChannelSchema, ErrorBodySchema, ScheduleSchema, StatusSchema } from "./schemas";

class ApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

export async function request(path: string, init?: RequestInit): Promise<Response> {
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

export async function getJson<T extends v.GenericSchema>(
	path: string,
	schema: T,
): Promise<v.InferOutput<T>> {
	const res = await request(path);
	const body: unknown = await res.json();
	return v.parse(schema, body);
}

export const fetchStatus = async () => await getJson("/api/status", StatusSchema);

export const fetchChannels = async () => await getJson("/api/channels", v.array(ChannelSchema));

export const fetchSchedules = async () =>
	await getJson("/api/recording/schedules", v.array(ScheduleSchema));

export async function addSchedule(programId: number): Promise<void> {
	await request(`/api/recording/schedules/${programId}`, { method: "PUT" });
}

export async function removeSchedule(programId: number): Promise<void> {
	await request(`/api/recording/schedules/${programId}`, { method: "DELETE" });
}
