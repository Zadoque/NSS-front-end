import { realAuth } from "../auth/realAuth";

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

export async function requestJson(path: string, init: RequestInit = {}, allowRefresh = true): Promise<unknown> {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = realAuth.getAccessToken();
  const response = await fetch(`${base}/api/v1${path}`, { ...init, credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) }, signal: AbortSignal.timeout(15_000) });
  if (response.status === 401 && token && allowRefresh) { const refreshed = await realAuth.refresh(); if (refreshed) return requestJson(path, init, false); }
  if (!response.ok) { let message = `Falha na operação (${response.status}).`; try { const body = await response.json(); if (body.message) message = body.message; } catch { /* empty */ } throw new Error(message); }
  if (response.status === 204) return null;
  return response.json();
}
