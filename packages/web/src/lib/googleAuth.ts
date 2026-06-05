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
      existing.addEventListener("error", () => reject(new Error("GIS の読み込みに失敗しました")));
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

const TOKEN_KEY = "money-note.token";

function readStoredToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
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
  if (t) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(t));
  else sessionStorage.removeItem(TOKEN_KEY);
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

/**
 * Return a valid access token, prompting the user only when necessary.
 * @param clientId Google OAuth Web client id.
 * @param interactive If true, a consent/account popup may be shown.
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

  return new Promise<string>((resolve, reject) => {
    client.callback = (resp: TokenResponse) => {
      if (resp.error || !resp.access_token) {
        reject(new Error(resp.error_description || resp.error || "認証に失敗しました"));
        return;
      }
      const token: StoredToken = {
        accessToken: resp.access_token,
        expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
      };
      writeStoredToken(token);
      resolve(resp.access_token);
    };
    // prompt: "" attempts a silent grant; "consent" forces the popup.
    client.requestAccessToken({ prompt: interactive ? "consent" : "" });
  });
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
}
