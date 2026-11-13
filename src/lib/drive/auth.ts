// Google の OAuth をページ全体のリダイレクト（implicit flow）で行う。
// ポップアップ方式は iOS のホーム画面アプリでサードパーティ Cookie が使えず、
// 起動のたびに接続が切れるため使わない。

const scope = "https://www.googleapis.com/auth/drive.appdata";
const authEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const revokeEndpoint = "https://oauth2.googleapis.com/revoke";

const tokenKey = "cash-kitty-v2.token";
const silentReconnectKey = "cash-kitty-v2.silent-reconnect";
const pendingKey = "cash-kitty-v2.auth-pending";
const loginHintKey = "cash-kitty-v2.login-hint";
const silentFailuresKey = "cash-kitty-v2.silent-failures";

const maxSilentFailures = 3;

export const googleClientId = readClientId();

// Bun はビルド時に存在する BUN_PUBLIC_* だけを埋め込む。未設定だと
// process.env の参照が残り、ブラウザでは例外になる
function readClientId() {
  try {
    return process.env.BUN_PUBLIC_GOOGLE_CLIENT_ID || "";
  } catch {
    return "";
  }
}

type StoredToken = { accessToken: string; expiresAt: number };

type AuthMode = "silent" | "interactive";

type PendingAuth = { nonce: string; mode: AuthMode; returnHash: string };

function readJson<T>(storage: Storage, key: string) {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function getValidToken() {
  const token = readJson<StoredToken>(localStorage, tokenKey);
  return token && token.expiresAt - 60_000 > Date.now()
    ? token.accessToken
    : undefined;
}

export function clearToken() {
  localStorage.removeItem(tokenKey);
}

let redirectOutcome: { mode: AuthMode; ok: boolean; error?: string } | null =
  null;

export function consumeAuthRedirect() {
  const params = new URLSearchParams(location.hash.slice(1));
  const hasAuthHash = params.has("access_token") || params.has("error");
  const pending = readJson<PendingAuth>(sessionStorage, pendingKey);
  sessionStorage.removeItem(pendingKey);
  if (hasAuthHash) {
    history.replaceState(
      null,
      "",
      location.pathname + location.search + (pending?.returnHash ?? ""),
    );
  }
  if (!pending) return;

  if (!hasAuthHash || params.get("state") !== pending.nonce) {
    redirectOutcome = { mode: pending.mode, ok: false };
    return;
  }

  const accessToken = params.get("access_token");
  if (accessToken) {
    const expiresIn = Number(params.get("expires_in")) || 3600;
    const token: StoredToken = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    localStorage.setItem(tokenKey, JSON.stringify(token));
    localStorage.setItem(silentReconnectKey, "1");
    localStorage.removeItem(silentFailuresKey);
    redirectOutcome = { mode: pending.mode, ok: true };
    return;
  }

  const error = params.get("error") ?? "unknown";
  if (pending.mode === "silent") recordSilentFailure();
  redirectOutcome = {
    mode: pending.mode,
    ok: false,
    error:
      error === "access_denied"
        ? "Google Drive へのアクセスが許可されませんでした。"
        : `認証に失敗しました（${error}）。`,
  };
}

function recordSilentFailure() {
  const failures = Number(localStorage.getItem(silentFailuresKey)) + 1;
  if (failures >= maxSilentFailures) {
    localStorage.removeItem(silentReconnectKey);
    localStorage.removeItem(silentFailuresKey);
  } else {
    localStorage.setItem(silentFailuresKey, String(failures));
  }
}

export function hasLoginHint() {
  return localStorage.getItem(loginHintKey) !== null;
}

export function setLoginHint(email: string) {
  localStorage.setItem(loginHintKey, email);
}

export function getAuthRedirectError() {
  if (redirectOutcome?.mode !== "interactive" || redirectOutcome.ok) {
    return undefined;
  }
  return redirectOutcome.error ?? "認証がキャンセルされました。";
}

export function canSilentReconnect() {
  const silentFailed =
    redirectOutcome?.mode === "silent" && !redirectOutcome.ok;
  return (
    localStorage.getItem(silentReconnectKey) === "1" &&
    !silentFailed &&
    navigator.onLine
  );
}

export function beginAuthRedirect(mode: AuthMode) {
  const nonce = crypto.randomUUID();
  const pending: PendingAuth = { nonce, mode, returnHash: location.hash };
  sessionStorage.setItem(pendingKey, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: location.origin + location.pathname,
    response_type: "token",
    scope,
    state: nonce,
    include_granted_scopes: "true",
  });
  // 複数の Google アカウントにログインしていると、login_hint なしの
  // prompt=none は interaction_required で失敗する
  const loginHint = localStorage.getItem(loginHintKey);
  if (loginHint) params.set("login_hint", loginHint);
  if (mode === "silent") params.set("prompt", "none");
  location.assign(`${authEndpoint}?${params}`);
}

export function signOut() {
  const token = getValidToken();
  if (token) {
    fetch(`${revokeEndpoint}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).catch(() => {});
  }
  clearToken();
  localStorage.removeItem(silentReconnectKey);
  localStorage.removeItem(silentFailuresKey);
  localStorage.removeItem(loginHintKey);
}
