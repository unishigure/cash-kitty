/** Color-scheme preference, persisted to localStorage (separate from AppSettings). */
export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "money-note.theme";

export const DEFAULT_THEME: Theme = "system";

export function loadTheme(): Theme {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw === "light" || raw === "dark" || raw === "system") return raw;
	} catch {
		// ignore
	}
	return DEFAULT_THEME;
}

export function saveTheme(theme: Theme): void {
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// ignore
	}
}

/** Whether the given preference resolves to dark right now. */
export function resolveDark(theme: Theme): boolean {
	if (theme === "system") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches;
	}
	return theme === "dark";
}

/** Toggle the `dark` class on <html> to match the resolved preference. */
export function applyTheme(theme: Theme): void {
	document.documentElement.classList.toggle("dark", resolveDark(theme));
}
