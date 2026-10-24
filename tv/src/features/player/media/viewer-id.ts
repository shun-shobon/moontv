import { randomUUID } from "expo-crypto";

/** Hermes には crypto.getRandomValues が無い。 */
export const createViewerId = (): string => randomUUID();
