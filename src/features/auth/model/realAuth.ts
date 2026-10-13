export type Session = { email: string; displayName: string; permissions: string[] };
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
  user?: { email?: string; name?: string; nome?: string };
  permissions?: string[];
};

const runtimeEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const base = (runtimeEnv.VITE_API_BASE_URL || "").replace(/\/$/, "");
const endpoint = (path: string) => `${base}/api/v1/auth${path}`;
let accessToken: string | null = null;
let session: Session | null = null;
let refreshPromise: Promise<Session | null> | null = null;
const listeners = new Set<() => void>();

function notify() { listeners.forEach((listener) => listener()); }

function setSession(response: LoginResponse): Session {
  accessToken = response.accessToken ?? response.token ?? null;
  if (!accessToken) throw new Error("Resposta de autenticação inválida.");
  session = {
    email: response.user?.email ?? "",
    displayName: response.user?.name ?? response.user?.nome ?? response.user?.email ?? "Usuário",
    permissions: response.permissions ?? [],
  };
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

export const realAuth = {
  getSession: () => session,
  getAccessToken: () => accessToken,
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  async login(email: string, password: string) {
    const response = await fetch(endpoint("/login"), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      signal: AbortSignal.timeout(15_000),
    });
    return setSession(await parseResponse(response));
  },
  async refresh(): Promise<Session | null> {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const response = await fetch(endpoint("/refresh"), {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        return setSession(await parseResponse(response));
      } catch {
        accessToken = null;
        session = null;
        notify();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  },
  async restore() { return realAuth.refresh(); },
  async logout() {
    try {
      await fetch(endpoint("/logout"), { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
    } finally {
      accessToken = null;
      session = null;
      notify();
    }
  },
};
