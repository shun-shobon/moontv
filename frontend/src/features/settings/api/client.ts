import * as v from "valibot";

import { getJson } from "../../../shared/api/client";
import { TunerSchema } from "./schemas";

export const fetchTuners = async () => await getJson("/api/tuners", v.array(TunerSchema));
