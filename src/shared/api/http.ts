import { realAuth } from "../../features/auth/model/realAuth";

export async function getJson(path: string, allowRefresh = true): Promise<unknown> {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const token = realAuth.getAccessToken();
  const revision = realAuth.getRevision();
  const userId = realAuth.getSession()?.id;
  if (token && !realAuth.isCurrentSession()) throw new DOMException("A sessão mudou antes da consulta", "AbortError");
  const response = await fetch(`${base}/api/v1${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal: AbortSignal.timeout(15_000),
  });
  if (token && realAuth.getRevision() !== revision) throw new DOMException("A sessão mudou durante a consulta", "AbortError");
  if (response.status === 401 && token && userId != null && allowRefresh && realAuth.getRevision() === revision) {
    const refreshed = await realAuth.refresh();
    if (refreshed?.id === userId && realAuth.getRevision() === revision) return getJson(path, false);
  }
  if (!response.ok) throw new Error(`Falha na consulta (${response.status}).`);
  const body: unknown = await response.json();
  if (token && realAuth.getRevision() !== revision) throw new DOMException("A sessão mudou durante a consulta", "AbortError");
  return body;
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
  const revision = realAuth.getRevision();
  const userId = realAuth.getSession()?.id;
  if (token && !realAuth.isCurrentSession()) throw new DOMException("A sessão mudou antes da operação", "AbortError");
  const method = (init.method || "GET").toUpperCase();
  const csrfProtected = method !== "GET" && method !== "HEAD" && method !== "OPTIONS"
    && !path.startsWith("/auth/login")
    && !path.startsWith("/auth/refresh")
    && !path.startsWith("/auth/logout")
    && !path.startsWith("/auth/first-access")
    && !path.startsWith("/auth/password-reset/");
  const csrf = csrfProtected ? await csrfToken() : null;
  if (token && realAuth.getRevision() !== revision) throw new DOMException("A sessão mudou durante a operação", "AbortError");
  const response = await fetch(`${base}/api/v1${path}`, { ...init, credentials: "include", headers: { Accept: "application/json", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(csrf ? { "X-XSRF-TOKEN": csrf } : {}), ...(init.headers || {}) }, signal: AbortSignal.timeout(15_000) });
  if (token && realAuth.getRevision() !== revision) throw new DOMException("A sessão mudou durante a operação", "AbortError");
  if (response.status === 401 && token && userId != null && allowRefresh && realAuth.getRevision() === revision) { const refreshed = await realAuth.refresh(); if (refreshed?.id === userId && realAuth.getRevision() === revision) return requestJson(path, init, false); }
  if (!response.ok) { let message = `Falha na operação (${response.status}).`; try { const body = await response.json(); if (body.message) message = body.message; } catch { /* empty */ } throw new Error(message); }
  if (response.status === 204) return null;
  const body: unknown = await response.json();
  if (token && realAuth.getRevision() !== revision) throw new DOMException("A sessão mudou durante a operação", "AbortError");
  return body;
}
