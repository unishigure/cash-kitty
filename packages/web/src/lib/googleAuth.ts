/**
 * Google Drive OAuth via full-page redirect (implicit token flow).
 *
 * We previously used the GIS popup token client, but its "silent" grant relies
 * on a popup + third-party cookies, which iOS standalone PWAs block (ITP), so
 * the connection appeared dropped on every launch. A top-level redirect to
 * accounts.google.com is first-party: as long as the Google session cookie in
 * this browsing container is alive, `prompt=none` bounces straight back with a
 * fresh token and no UI. Tokens are short-lived (~1h, no refresh token) and
 * scoped to `drive.appdata` only, so the app can read/write its own hidden
 * folder and nothing else in the user's Drive.
 *
 * NOTE: the app's URL (origin + path) must be registered as an *Authorized
 * redirect URI* on the OAuth client in Google Cloud Console — JavaScript
 * origins alone (which the popup model used) are not enough.
 */

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

interface StoredToken {
	accessToken: string;
	expiresAt: number; // epoch ms
}

// We persist in localStorage (not sessionStorage) so the connection survives a
// task kill / app restart on mobile. The token itself is short-lived (~1h) and
// scoped to drive.appdata; an expired entry is simply ignored on read.
const TOKEN_KEY = "cash-kitty.token";
// Remembers that the user has connected at least once, so the next launch can
// attempt a silent (prompt=none) re-auth without bothering the user.
const CONNECTED_KEY = "cash-kitty.connected";
// In-flight auth round-trip: written just before redirecting to Google, read
// back (and cleared) when the redirect returns. sessionStorage on purpose —
// it is meaningless outside the tab that started the redirect.
const PENDING_KEY = "cash-kitty.auth-pending";

function readStoredToken(): StoredToken | null {
	try {
		const raw = localStorage.getItem(TOKEN_KEY);
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
		return;
	}
	localStorage.removeItem(TOKEN_KEY);
}

function setConnectedFlag(on: boolean): void {
	try {
		if (on) localStorage.setItem(CONNECTED_KEY, "1");
		else localStorage.removeItem(CONNECTED_KEY);
	} catch {
		/* ignore */
	}
}

/** Whether the user has connected before (persisted across app restarts). */
export function wasConnected(): boolean {
	try {
		return localStorage.getItem(CONNECTED_KEY) === "1";
	} catch {
		return false;
	}
}

/** Whether we currently hold a non-expired token. */
export function hasValidToken(): boolean {
	return readStoredToken() !== null;
}

/** The cached access token, or null if missing/expired. */
export function getValidToken(): string | null {
	return readStoredToken()?.accessToken ?? null;
}

/** Drop the cached token (e.g. after a 401) without forgetting the connection. */
export function clearToken(): void {
	writeStoredToken(null);
}

type AuthMode = "silent" | "interactive";

interface PendingAuth {
	nonce: string;
	mode: AuthMode;
	/** Tab to restore after the round-trip (e.g. "settings"). */
	returnTab?: string;
}

function readPending(): PendingAuth | null {
	try {
		const raw = sessionStorage.getItem(PENDING_KEY);
		return raw ? (JSON.parse(raw) as PendingAuth) : null;
	} catch {
		return null;
	}
}

function clearPending(): void {
	try {
		sessionStorage.removeItem(PENDING_KEY);
	} catch {
		/* ignore */
	}
}

/** Outcome of the auth redirect this page load returned from, if any. */
let redirectOutcome: {
	mode: AuthMode;
	ok: boolean;
	/** User-facing message for a failed *interactive* attempt. */
	error?: string;
	returnTab?: string;
} | null = null;

/**
 * Consume the OAuth response in the URL fragment, if we are returning from an
 * auth redirect. Must run once at startup, *before* React renders, so initial
 * state already sees the stored token and the token never lingers in the URL.
 */
export function consumeAuthRedirect(): void {
	const params = new URLSearchParams(location.hash.slice(1));
	const hasAuthHash = params.has("access_token") || params.has("error");
	if (hasAuthHash) {
		// Strip the fragment immediately — keep tokens out of history.
		history.replaceState(null, "", location.pathname + location.search);
	}
	const pending = readPending();
	if (!pending) return;
	clearPending();

	if (!hasAuthHash || params.get("state") !== pending.nonce) {
		// We left for auth but came back without a (matching) response — the
		// user backed out or hit an error page. Count it as a failed attempt so
		// this load doesn't redirect again, but keep the connected flag so the
		// next launch can retry.
		redirectOutcome = {
			mode: pending.mode,
			ok: false,
			returnTab: pending.returnTab,
		};
		return;
	}

	const token = params.get("access_token");
	if (token) {
		writeStoredToken({
			accessToken: token,
			expiresAt: Date.now() + (Number(params.get("expires_in")) || 3600) * 1000,
		});
		setConnectedFlag(true);
		redirectOutcome = {
			mode: pending.mode,
			ok: true,
			returnTab: pending.returnTab,
		};
		return;
	}

	const error = params.get("error") ?? "unknown";
	if (pending.mode === "silent") {
		// A definitive answer (login_required / consent_required / …): silent
		// re-auth cannot succeed until the user reconnects interactively, so
		// stop auto-attempting on future launches.
		setConnectedFlag(false);
	}
	redirectOutcome = {
		mode: pending.mode,
		ok: false,
		error:
			error === "access_denied"
				? "Google Drive へのアクセスが許可されませんでした"
				: `認証に失敗しました (${error})`,
		returnTab: pending.returnTab,
	};
}

/** Tab to restore after an auth round-trip ("settings" etc.), or null. */
export function getResumeTab(): string | null {
	return redirectOutcome?.returnTab ?? null;
}

/** User-facing message when an *interactive* auth attempt just failed. */
export function getAuthRedirectError(): string | null {
	if (!redirectOutcome || redirectOutcome.ok) return null;
	if (redirectOutcome.mode !== "interactive") return null;
	return redirectOutcome.error ?? "認証がキャンセルされました";
}

/** True when the silent attempt this page load returned from has failed. */
function silentAuthFailed(): boolean {
	return redirectOutcome?.mode === "silent" && !redirectOutcome.ok;
}

/**
 * Whether a silent (prompt=none) reconnect is worth attempting now: the user
 * has connected before, the attempt we may just have returned from didn't
 * fail, and we're not knowingly offline (redirecting offline would strand the
 * user on a browser error page).
 */
export function canSilentReconnect(): boolean {
	return wasConnected() && !silentAuthFailed() && navigator.onLine !== false;
}

/**
 * Navigate to Google's auth endpoint (full-page redirect). Does not return —
 * the page unloads, and `consumeAuthRedirect` picks up the result on the way
 * back. `silent` mode (`prompt=none`) never shows UI: it either bounces back
 * with a token or with an error in the fragment.
 */
export function beginAuthRedirect(
	clientId: string,
	mode: AuthMode,
	returnTab?: string,
): void {
	const nonce = crypto.randomUUID();
	const pending: PendingAuth = { nonce, mode, returnTab };
	// Without the nonce stored we could not validate the response, so give up
	// rather than redirect (sessionStorage can fail in exotic privacy modes).
	sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: location.origin + location.pathname,
		response_type: "token",
		scope: SCOPE,
		state: nonce,
		include_granted_scopes: "true",
	});
	if (mode === "silent") params.set("prompt", "none");
	location.assign(`${AUTH_ENDPOINT}?${params}`);
}

/** Forget the cached token (and best-effort revoke it on Google's side). */
export function signOut(): void {
	const token = getValidToken();
	if (token) {
		void fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		}).catch(() => {
			/* best effort */
		});
	}
	writeStoredToken(null);
	setConnectedFlag(false);
}
