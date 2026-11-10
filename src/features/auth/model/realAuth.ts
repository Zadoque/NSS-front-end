export type Session = { id?: number; email: string; displayName: string; permissions: string[] };
export type AuthClient = {
  getSession(): Session | null;
  subscribe(listener: () => void): () => void;
  login(email: string, password: string): Promise<Session>;
  restore(): Promise<Session | null>;
  logout(): Promise<void> | void;
};

type LoginResponse = {
  accessToken?: string;
  token?: string;
  user?: { id?: number; email?: string; name?: string; nome?: string };
  permissions?: string[];
};

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const base = (runtimeEnv.VITE_API_BASE_URL || "").replace(/\/$/, "");
const endpoint = (path: string) => `${base}/api/v1/auth${path}`;
let accessToken: string | null = null;
let session: Session | null = null;
let sessionSignal: string | null = null;
let refreshPromise: Promise<Session | null> | null = null;
const listeners = new Set<() => void>();
let authEpoch = 0;
let lastReceivedSignal: string | undefined;
let pendingUserId: number | undefined;
let remotePending = false;
const authSignalKey = "nss-auth-changed-v1";
const authChannel = (() => {
  try { return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(authSignalKey); }
  catch { return null; }
})();

function invalidateRemoteSession() {
  authEpoch += 1;
  accessToken = null;
  session = null;
  sessionSignal = null;
  notify();
}

function recoverExpectedSession(expected: { userId: number; signal: string | null }) {
  void (async () => {
    try { await refreshPromise; } catch { /* retry against the expected cookie */ }
    if (!session && currentSignal() === expected.signal) await realAuth.refresh(expected);
  })().catch(() => null);
}

function receiveSessionChange(value: unknown) {
  if (!value || typeof value !== "object") return;
  const event = value as { type?: string; userId?: number; nonce?: string; persisted?: boolean };
  let latest: string | null;
  try {
    latest = localStorage.getItem(authSignalKey);
    if ((!latest && event.type === "pending") || (latest && JSON.parse(latest).nonce !== event.nonce)) return;
  } catch { invalidateRemoteSession(); return; }
  if (event.nonce && event.nonce === lastReceivedSignal) return;
  lastReceivedSignal = event.nonce;
  if (event.type === "pending") {
    remotePending = true;
    // Keep the previous pending identity across duplicate pending signals so
    // the following login event can still be matched to the right account.
    pendingUserId = session?.id ?? pendingUserId;
    invalidateRemoteSession();
    return;
  }
  if (event.type === "login" && event.userId != null && (event.userId === session?.id || event.userId === pendingUserId)) {
    const expected = { userId: event.userId, signal: latest };
    pendingUserId = undefined;
    invalidateRemoteSession();
    recoverExpectedSession(expected);
    return;
  }
  if (event.type === "login" || event.type === "logout") {
    remotePending = false;
    pendingUserId = undefined;
    invalidateRemoteSession();
  }
}
authChannel?.addEventListener("message", (event) => receiveSessionChange(event.data));
window.addEventListener("storage", (event) => {
  if (event.key === authSignalKey) {
    if (event.newValue) {
      try { receiveSessionChange(JSON.parse(event.newValue)); } catch { /* ignore unrelated data */ }
    } else if (pendingUserId != null) {
      const expected = { userId: pendingUserId, signal: null };
      pendingUserId = undefined;
      if (currentSignal() === null) recoverExpectedSession(expected);
    }
  }
});

function announceSessionChange(type: "login" | "logout", userId?: number) {
  const event = { type, userId, nonce: `${Date.now()}-${Math.random()}`, persisted: true };
  localStorage.setItem(authSignalKey, JSON.stringify(event));
  try { authChannel?.postMessage(event); } catch { /* storage event is the fallback */ }
}

function reserveCookieChange(): string {
  // A durable pending marker makes other tabs fail closed even if this tab
  // closes or cannot publish the final signal after the HTTP response.
  localStorage.getItem(authSignalKey);
  const pending = JSON.stringify({ type: "pending", nonce: `${Date.now()}-${Math.random()}` });
  localStorage.setItem(authSignalKey, pending);
  return pending;
}

function rollbackCookieChange(pending: string, previous: string | null): boolean {
  if (currentSignal() !== pending) return false;
  if (previous === null) localStorage.removeItem(authSignalKey);
  else localStorage.setItem(authSignalKey, previous);
  return true;
}

function assertStorageAvailable(): void {
  const key = `${authSignalKey}:probe`;
  localStorage.getItem(authSignalKey);
  localStorage.setItem(key, "1");
  localStorage.removeItem(key);
}

function isPendingSignal(signal: string | null): boolean {
  if (!signal) return false;
  try { return JSON.parse(signal).type === "pending"; } catch { return true; }
}

async function withAuthLock<T>(operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error("Este navegador não oferece o recurso necessário para proteger a sessão. Atualize o navegador ou use uma conexão segura.");
  return navigator.locks.request("nss-auth-cookie-v1", operation);
}

function currentSignal(): string | null {
  try { return localStorage.getItem(authSignalKey); } catch { return "storage-unavailable"; }
}

function notify() { listeners.forEach((listener) => listener()); }

function setSession(response: LoginResponse): Session {
  accessToken = response.accessToken ?? response.token ?? null;
  if (!accessToken) throw new Error("Resposta de autenticação inválida.");
  session = {
    id: response.user?.id,
    email: response.user?.email ?? "",
    displayName: response.user?.name ?? response.user?.nome ?? response.user?.email ?? "Usuário",
    permissions: response.permissions ?? [],
  };
  sessionSignal = currentSignal();
  remotePending = false;
  notify();
  return session;
}

async function parseResponse(response: Response): Promise<LoginResponse> {
  let body: unknown = null;
  try { body = await response.json(); } catch { /* resposta sem corpo */ }
  if (!response.ok) {
    const message = body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
      ? (body as { message: string }).message
      : "Não foi possível autenticar.";
    throw new Error(message);
  }
  return body as LoginResponse;
}

async function cookieUnchanged(response: Response, operation: "login" | "logout"): Promise<boolean> {
  try {
    const body = await response.clone().json() as { code?: string };
    if (operation === "logout") return response.status === 503 && body.code === "AUTH_UNAVAILABLE";
    return (response.status === 401 && body.code === "UNAUTHORIZED")
      || (response.status === 429 && body.code === "RATE_LIMITED")
      || (response.status === 503 && body.code === "AUTH_UNAVAILABLE")
      || (response.status === 400 && body.code === "INVALID_REQUEST");
  } catch { return false; }
}

export const realAuth = {
  getSession: () => session,
  getAccessToken: () => accessToken,
  getEpoch: () => authEpoch,
  isTemporarilySuspended: () => remotePending,
  getRevision: () => JSON.stringify([authEpoch, currentSignal()]),
  isCurrentSession: () => !session || (sessionSignal === currentSignal() && !isPendingSignal(sessionSignal)),
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  async login(email: string, password: string) {
    return withAuthLock(async () => {
      const previous = currentSignal();
      const pending = reserveCookieChange();
      let safelyRolledBack = false;
      try {
      const response = await fetch(endpoint("/login"), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      signal: AbortSignal.timeout(15_000),
    });
      if (await cookieUnchanged(response, "login")) safelyRolledBack = rollbackCookieChange(pending, previous);
      const body = await parseResponse(response);
      authEpoch += 1;
      announceSessionChange("login", body.user?.id);
      const result = setSession(body);
      return result;
      } catch (error) {
        if (!safelyRolledBack) invalidateRemoteSession();
        throw error;
      }
    });
  },
  async refresh(expected?: { userId: number; signal: string | null }): Promise<Session | null> {
    if (!navigator.locks) throw new Error("Este navegador não oferece o recurso necessário para proteger a sessão. Atualize o navegador ou use uma conexão segura.");
    if (expected && currentSignal() !== expected.signal) return null;
    if (refreshPromise) return refreshPromise;
    if (session && sessionSignal !== currentSignal()) {
      invalidateRemoteSession();
      return null;
    }
    const epoch = authEpoch;
    const signal = currentSignal();
    const expectedUserId = expected?.userId ?? session?.id;
    refreshPromise = withAuthLock(async () => {
      try {
        if (authEpoch !== epoch || currentSignal() !== signal) return null;
        if (isPendingSignal(signal)) throw new Error("A sessão precisa ser autenticada novamente.");
        assertStorageAvailable();
        const response = await fetch(endpoint("/refresh"), {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (authEpoch !== epoch || currentSignal() !== signal) return null;
        if (response.status === 429 || response.status >= 500) {
          throw new Error("Serviço de autenticação temporariamente indisponível.");
        }
        if (!response.ok && response.status !== 401 && response.status !== 403) {
          throw new Error("Não foi possível renovar a sessão.");
        }
        if (response.status === 401 || response.status === 403) {
          // This is a definitive session rejection, unlike 429/5xx. Allow a
          // subsequent login to repopulate the same account's daily cache.
          remotePending = false;
          pendingUserId = undefined;
          invalidateRemoteSession();
          return null;
        }
        const body = await parseResponse(response);
        if (authEpoch !== epoch || currentSignal() !== signal) return null;
        if (expectedUserId != null && body.user?.id !== expectedUserId) {
          invalidateRemoteSession();
          return null;
        }
        return setSession(body);
      } finally {
        refreshPromise = null;
      }
    });
    return refreshPromise;
  },
  async restore() { return realAuth.refresh(); },
  async logout() {
    if (!session) throw new Error("Não há uma sessão ativa para encerrar.");
    if (session && sessionSignal !== currentSignal()) throw new Error("A sessão mudou. Tente novamente.");
    const epoch = authEpoch;
    const signal = currentSignal();
    await withAuthLock(async () => {
      if (authEpoch !== epoch || currentSignal() !== signal) throw new Error("A sessão mudou. Tente novamente.");
      const pending = reserveCookieChange();
      let safelyRolledBack = false;
      try {
      const response = await fetch(endpoint("/logout"), { method: "POST", credentials: "include", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15_000) });
      if (await cookieUnchanged(response, "logout")) safelyRolledBack = rollbackCookieChange(pending, signal);
      if (!response.ok) throw new Error("Não foi possível encerrar a sessão. Tente novamente.");
      if (authEpoch !== epoch || currentSignal() !== pending) throw new Error("A sessão mudou. Tente novamente.");
      announceSessionChange("logout");
      invalidateRemoteSession();
      } catch (error) {
        if (!safelyRolledBack) invalidateRemoteSession();
        throw error;
      }
    });
  },
};
