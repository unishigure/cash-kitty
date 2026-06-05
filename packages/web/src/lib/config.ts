/** Config provided by the web server, sourced from its `.env` file. */
export interface ServerConfig {
  googleClientId: string;
  apiBaseUrl: string;
}

/**
 * Fetch server-side config from `/api/config`. Empty/missing values are
 * dropped so callers can fall back to localStorage / defaults. Never throws.
 */
export async function fetchServerConfig(): Promise<Partial<ServerConfig>> {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return {};
    const body = (await res.json()) as Partial<ServerConfig>;
    const out: Partial<ServerConfig> = {};
    if (body.googleClientId) out.googleClientId = body.googleClientId;
    if (body.apiBaseUrl) out.apiBaseUrl = body.apiBaseUrl;
    return out;
  } catch {
    return {};
  }
}
