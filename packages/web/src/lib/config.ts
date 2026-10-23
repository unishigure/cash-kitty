export interface AppConfig {
	googleClientId: string;
	apiBaseUrl: string;
}

/**
 * Config baked into the bundle from `BUN_PUBLIC_*` env vars. Bun inlines
 * `process.env.BUN_PUBLIC_*` as literals in both `bun dev` (via `bunfig.toml`'s
 * `[serve.static] env`) and `bun run build`. There is no runtime override.
 */
export const BUILD_CONFIG: AppConfig = {
	googleClientId: buildEnv(() => process.env.BUN_PUBLIC_GOOGLE_CLIENT_ID),
	apiBaseUrl: buildEnv(() => process.env.BUN_PUBLIC_OCR_API_URL),
};

// Bun inlines only the variables that exist at build time. An unset one stays
// a live `process.env` reference, which throws in the browser.
function buildEnv(read: () => string | undefined): string {
	try {
		return read() || "";
	} catch {
		return "";
	}
}

export const MISSING_CLIENT_ID_MESSAGE =
	"このビルドには BUN_PUBLIC_GOOGLE_CLIENT_ID が設定されていません";

export const MISSING_OCR_URL_MESSAGE =
	"このビルドには BUN_PUBLIC_OCR_API_URL が設定されていません";
