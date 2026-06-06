import { useCallback, useState } from "react";
import { type AppConfig, BUILD_CONFIG } from "../lib/config";
import {
	type AppSettings,
	loadSettings,
	saveSettings as persist,
} from "../lib/settings";

export interface SettingsApi {
	/** Effective settings: build-time (`BUN_PUBLIC_*`) values win over localStorage. */
	settings: AppSettings;
	/** Which fields are fixed at build time (and thus not user-editable). */
	managed: Record<keyof AppConfig, boolean>;
	/** Persist user overrides (ignored for build-managed fields). */
	update: (patch: Partial<AppSettings>) => void;
}

/**
 * Settings come from two sources, in order of precedence:
 *  - build-time `BUN_PUBLIC_*` values baked into the bundle — authoritative
 *    when set (see `lib/config.ts`)
 *  - the browser's localStorage — user fallback for anything not baked in
 */
export function useSettings(): SettingsApi {
	const [stored, setStored] = useState<AppSettings>(() => loadSettings());

	const update = useCallback((patch: Partial<AppSettings>) => {
		setStored((prev) => {
			const next = { ...prev, ...patch };
			persist(next);
			return next;
		});
	}, []);

	const settings: AppSettings = {
		apiBaseUrl: BUILD_CONFIG.apiBaseUrl || stored.apiBaseUrl,
		googleClientId: BUILD_CONFIG.googleClientId || stored.googleClientId,
	};

	const managed = {
		apiBaseUrl: Boolean(BUILD_CONFIG.apiBaseUrl),
		googleClientId: Boolean(BUILD_CONFIG.googleClientId),
	};

	return { settings, managed, update };
}
