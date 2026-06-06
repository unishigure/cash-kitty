import { useCallback, useEffect, useState } from "react";
import { applyTheme, loadTheme, saveTheme, type Theme } from "../lib/theme";

export interface ThemeApi {
	/** The user's preference: light, dark, or follow the OS. */
	theme: Theme;
	/** Persist a new preference and apply it immediately. */
	setTheme: (theme: Theme) => void;
}

/**
 * Owns the color-scheme preference: keeps the `dark` class on <html> in sync and
 * follows the OS while the preference is "system". An inline script in index.html
 * applies the initial class before paint, so this only handles later changes.
 */
export function useTheme(): ThemeApi {
	const [theme, setThemeState] = useState<Theme>(() => loadTheme());

	// Re-apply whenever the preference changes.
	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	// While following the OS, react to live system changes.
	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyTheme("system");
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [theme]);

	const setTheme = useCallback((next: Theme) => {
		saveTheme(next);
		setThemeState(next);
	}, []);

	return { theme, setTheme };
}
