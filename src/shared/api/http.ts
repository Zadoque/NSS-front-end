import { realAuth } from "../../features/auth/model/realAuth";

export async function getJson(path: string, allowRefresh = true): Promise<unknown> {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = realAuth.getAccessToken();
  const response = await fetch(`${base}/api/v1${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 401 && token && allowRefresh) {
    const refreshed = await realAuth.refresh();
    if (refreshed) return getJson(path, false);
  }
  if (!response.ok) throw new Error(`Falha na consulta (${response.status}).`);
  return response.json();
}

let csrfPromise: Promise<string> | null = null;

async function csrfToken(): Promise<string> {
  if (!csrfPromise) {
    const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
    csrfPromise = fetch(`${base}/api/v1/auth/csrf`, {
      credentials: "include",
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(15_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Falha ao preparar a operação (${response.status}).`);
      const token = (await response.text()).trim();
      if (!token) throw new Error("Token de proteção ausente.");
      return token;
    }).finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

export async function requestJson(path: string, init: RequestInit = {}, allowRefresh = true): Promise<unknown> {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = realAuth.getAccessToken();
  const method = (init.method || "GET").toUpperCase();
  const csrfProtected = method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
    && !path.startsWith("/auth/login")
    && !path.startsWith("/auth/refresh")
    && !path.startsWith("/auth/logout")
    && !path.startsWith("/auth/first-access")
    && !path.startsWith("/auth/password-reset/");
  const csrf = csrfProtected ? await csrfToken() : null;
  const response = await fetch(`${base}/api/v1${path}`, { ...init, credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}), ...(init.headers || {}) }, signal: AbortSignal.timeout(15_000) });
  if (response.status === 401 && token && allowRefresh) { const refreshed = await realAuth.refresh(); if (refreshed) return requestJson(path, init, false); }
  if (!response.ok) { let message = `Falha na operação (${response.status}).`; try { const body = await response.json(); if (body.message) message = body.message; } catch { /* empty */ } throw new Error(message); }
  if (response.status === 204) return null;
  return response.json();
}
