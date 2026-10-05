export async function getJson(path: string): Promise<unknown> {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetch(`${base}/api/v1${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Falha na consulta (${response.status}).`);
  return response.json();
}
