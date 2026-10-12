import { useState } from "react";

import type { Preferences } from "../../../media/preferences";
import { loadPreferences, savePreferences } from "../../../media/preferences";

export const usePreferences = () => {
	const [preferences, setPreferences] = useState(loadPreferences);

	const updatePreferences = (next: Preferences) => {
		setPreferences(next);
		savePreferences(next);
	};

	return [preferences, updatePreferences] as const;
};
