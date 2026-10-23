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
	googleClientId: process.env.BUN_PUBLIC_GOOGLE_CLIENT_ID || "",
	apiBaseUrl: process.env.BUN_PUBLIC_OCR_API_URL || "",
};

export const MISSING_CLIENT_ID_MESSAGE =
	"このビルドには BUN_PUBLIC_GOOGLE_CLIENT_ID が設定されていません";

export const MISSING_OCR_URL_MESSAGE =
	"このビルドには BUN_PUBLIC_OCR_API_URL が設定されていません";
