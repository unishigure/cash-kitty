import { CATEGORIES } from "./categories";

/** Settings shared across devices, stored as one JSON file in the appDataFolder. */
export interface Preferences {
	/** Categories that count as fixed costs, in `CATEGORIES` order. */
	fixedCategories: string[];
}

export const DEFAULT_PREFERENCES: Preferences = { fixedCategories: [] };

const KNOWN = new Set<string>(CATEGORIES);

export function parsePreferences(raw: unknown): Preferences {
	const fixed =
		raw && typeof raw === "object" && "fixedCategories" in raw
			? raw.fixedCategories
			: undefined;
	if (!Array.isArray(fixed)) return DEFAULT_PREFERENCES;
	const chosen = new Set(fixed.filter((c) => KNOWN.has(c)));
	return { fixedCategories: CATEGORIES.filter((c) => chosen.has(c)) };
}

const STORAGE_KEY = "cash-kitty.preferences";

export function loadLocalPreferences(): Preferences {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? parsePreferences(JSON.parse(raw)) : DEFAULT_PREFERENCES;
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export function saveLocalPreferences(preferences: Preferences): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
	} catch {
		// ignore
	}
}

export function clearLocalPreferences(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
}
