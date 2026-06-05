/** User-configurable settings, persisted to localStorage. */
export interface AppSettings {
	/** Base URL of the OCR API (FastAPI). e.g. http://localhost:8000 */
	apiBaseUrl: string;
	/** Google OAuth 2.0 Web client id (created in Google Cloud Console). */
	googleClientId: string;
}

const STORAGE_KEY = "money-note.settings";

export const DEFAULT_SETTINGS: AppSettings = {
	// Empty = same-origin: the web server proxies /api/ocr/* to the OCR API.
	// This keeps the SPA working over HTTPS (no mixed content) and from phones.
	apiBaseUrl: "",
	googleClientId: "",
};

export function loadSettings(): AppSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		const parsed = JSON.parse(raw) as Partial<AppSettings>;
		return { ...DEFAULT_SETTINGS, ...parsed };
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(settings: AppSettings): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
