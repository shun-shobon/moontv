import * as v from "valibot";

import { getJson, request } from "../../../shared/api/client";
import { RecordingSchema } from "./schemas";

export const fetchRecordings = async () =>
	await getJson("/api/recordings", v.array(RecordingSchema));

export const fetchRecording = async (programId: number) =>
	await getJson(`/api/recordings/${programId}`, RecordingSchema);

export async function deleteRecording(programId: number): Promise<void> {
	await request(`/api/recordings/${programId}`, { method: "DELETE" });
}
