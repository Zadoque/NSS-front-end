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
