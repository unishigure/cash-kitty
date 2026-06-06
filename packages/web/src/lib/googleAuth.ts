/**
 * Thin wrapper around Google Identity Services (GIS) OAuth token client.
 *
 * We use the *token model* (implicit-style) which is appropriate for a pure
 * client-side SPA: it returns short-lived access tokens (~1h) and never exposes
 * a refresh token to the browser. We request only the `drive.appdata` scope, so
 * the app can read/write its own hidden folder and nothing else in the user's
 * Drive.
 */

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GSI_SRC = "https://accounts.google.com/gsi/client";

// --- Minimal GIS typings (the library is loaded at runtime via <script>) -----
interface TokenResponse {
	access_token?: string;
	expires_in?: number;
	error?: string;
	error_description?: string;
}
interface TokenClient {
	callback: (resp: TokenResponse) => void;
	requestAccessToken: (opts?: { prompt?: string }) => void;
}
interface GsiOAuth2 {
	initTokenClient: (config: {
		client_id: string;
		scope: string;
		callback: (resp: TokenResponse) => void;
	}) => TokenClient;
	revoke: (token: string, done?: () => void) => void;
}
declare global {
	interface Window {
		google?: { accounts?: { oauth2?: GsiOAuth2 } };
	}
}

let gsiLoading: Promise<void> | null = null;

/** Load the GIS client script once. */
function loadGsi(): Promise<void> {
	if (window.google?.accounts?.oauth2) return Promise.resolve();
	if (gsiLoading) return gsiLoading;

	gsiLoading = new Promise<void>((resolve, reject) => {
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${GSI_SRC}"]`,
		);
		if (existing) {
			existing.addEventListener("load", () => resolve());
			existing.addEventListener("error", () =>
				reject(new Error("GIS の読み込みに失敗しました")),
			);
			return;
		}
		const script = document.createElement("script");
		script.src = GSI_SRC;
		script.async = true;
		script.defer = true;
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("GIS の読み込みに失敗しました"));
		document.head.appendChild(script);
	});
	return gsiLoading;
}

interface StoredToken {
	accessToken: string;
	expiresAt: number; // epoch ms
}

// We persist in localStorage (not sessionStorage) so the connection survives a
// task kill / app restart on mobile. The token itself is short-lived (~1h) and
// scoped to drive.appdata; an expired entry is simply ignored on read.
const TOKEN_KEY = "cash-kitty.token";
const LEGACY_TOKEN_KEY = "money-note.token";
// Remembers that the user has connected at least once, so we can silently
// re-acquire a token on the next launch without showing a consent popup.
const CONNECTED_KEY = "cash-kitty.connected";
const LEGACY_CONNECTED_KEY = "money-note.connected";

function readStoredToken(): StoredToken | null {
	try {
		const raw =
			localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
		if (!raw) return null;
		const t = JSON.parse(raw) as StoredToken;
		// Keep a 60s safety margin.
		if (t.expiresAt - 60_000 > Date.now()) return t;
		return null;
	} catch {
		return null;
	}
}

function writeStoredToken(t: StoredToken | null): void {
	if (t) {
		localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
		localStorage.removeItem(LEGACY_TOKEN_KEY);
		return;
	}
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/** Whether the user has connected before (persisted across app restarts). */
export function wasConnected(): boolean {
	try {
		return (
			localStorage.getItem(CONNECTED_KEY) === "1" ||
			localStorage.getItem(LEGACY_CONNECTED_KEY) === "1"
		);
	} catch {
		return false;
	}
}

let tokenClient: TokenClient | null = null;
let tokenClientId: string | null = null;

function getTokenClient(clientId: string): TokenClient {
	const oauth2 = window.google?.accounts?.oauth2;
	if (!oauth2) throw new Error("Google ライブラリが初期化されていません");
	if (!tokenClient || tokenClientId !== clientId) {
		tokenClient = oauth2.initTokenClient({
			client_id: clientId,
			scope: SCOPE,
			callback: () => {}, // replaced per-request below
		});
		tokenClientId = clientId;
	}
	return tokenClient;
}

/** Issue a single token request with the given GIS `prompt` and persist it. */
function requestToken(client: TokenClient, prompt: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		client.callback = (resp: TokenResponse) => {
			if (resp.error || !resp.access_token) {
				reject(
					new Error(
						resp.error_description || resp.error || "認証に失敗しました",
					),
				);
				return;
			}
			const token: StoredToken = {
				accessToken: resp.access_token,
				expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
			};
			writeStoredToken(token);
			try {
				localStorage.setItem(CONNECTED_KEY, "1");
				localStorage.removeItem(LEGACY_CONNECTED_KEY);
			} catch {
				/* ignore */
			}
			resolve(resp.access_token);
		};
		// prompt: "" attempts a silent grant; "consent" forces the popup.
		client.requestAccessToken({ prompt });
	});
}

/**
 * Return a valid access token, prompting the user only when necessary.
 *
 * Always attempts a *silent* grant first (`prompt: ""`). As long as the user's
 * Google session and prior consent are intact, this succeeds without any popup,
 * so the connection survives access-token expiry (~1h) indefinitely. Only when
 * the silent grant fails *and* the caller allows interaction do we fall back to
 * a consent popup.
 *
 * @param clientId Google OAuth Web client id.
 * @param interactive If true, a consent/account popup may be shown on fallback.
 */
export async function getAccessToken(
	clientId: string,
	interactive: boolean,
): Promise<string> {
	if (!clientId) throw new Error("Google クライアント ID が設定されていません");

	const cached = readStoredToken();
	if (cached) return cached.accessToken;

	await loadGsi();
	const client = getTokenClient(clientId);

	try {
		return await requestToken(client, "");
	} catch (e) {
		if (!interactive) throw e;
		return requestToken(client, "consent");
	}
}

/** Whether we currently hold a non-expired token. */
export function hasValidToken(): boolean {
	return readStoredToken() !== null;
}

/** Forget the cached token (and best-effort revoke it on Google's side). */
export function signOut(): void {
	const cached = readStoredToken();
	if (cached) {
		try {
			window.google?.accounts?.oauth2?.revoke(cached.accessToken);
		} catch {
			/* ignore */
		}
	}
	writeStoredToken(null);
	try {
		localStorage.removeItem(CONNECTED_KEY);
	} catch {
		/* ignore */
	}
}
