/** Shape of the app's externally-supplied configuration. */
export interface AppConfig {
	googleClientId: string;
	apiBaseUrl: string;
}

/**
 * Config baked into the bundle from `BUN_PUBLIC_*` env vars.
 *
 * Bun inlines `process.env.BUN_PUBLIC_*` as literals when bundling — both the
 * dev server (`bun dev`, via `bunfig.toml`'s `[serve.static] env`) and the
 * static build (`bun run build`). This is the only source of server-supplied
 * config; anything unset here falls back to the user's localStorage settings.
 */
export const BUILD_CONFIG: Partial<AppConfig> = {
	googleClientId: process.env.BUN_PUBLIC_GOOGLE_CLIENT_ID || "",
	apiBaseUrl: process.env.BUN_PUBLIC_OCR_API_URL || "",
};
