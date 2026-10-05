import { getJson } from "../api/http";
import type { EpidemiologyDataSource, EpidemiologyFilters, EpidemiologyRequest, EpidemiologyResponse } from "../types/epidemiology";

export function parseCases(value: unknown, filters: EpidemiologyFilters): EpidemiologyResponse {
  if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) throw new Error("Resposta epidemiológica inválida.");
  const rawItems = (value as { items: unknown[] }).items;
  const items = rawItems.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Item epidemiológico inválido.");
    const x = item as Record<string, unknown>;
    if (typeof x.code === "string" && typeof x.notificationsTotal === "number") return x as unknown as EpidemiologyResponse["items"][number];
    if (typeof x.cdMun === "string" && typeof x.nmMun === "string" && typeof x.casesTotal === "number" && Number.isSafeInteger(x.casesTotal) && x.casesTotal >= 0) return { code: x.cdMun, name: x.nmMun, notificationsTotal: x.casesTotal, cdMun: x.cdMun, nmMun: x.nmMun, casesTotal: x.casesTotal } as unknown as EpidemiologyResponse["items"][number];
    throw new Error("Item epidemiológico inválido.");
  });
  if (new Set(items.map((item) => item.code)).size !== items.length) throw new Error("Territórios duplicados na resposta epidemiológica.");
  const x = value as Record<string, unknown>;
  const responseFilters = x.filters && typeof x.filters === "object" ? x.filters as Record<string, unknown> : x;
  if (responseFilters.year !== undefined && responseFilters.year !== null && responseFilters.year !== filters.year) throw new Error("Filtros divergentes na resposta epidemiológica.");
  if (responseFilters.month !== undefined && responseFilters.month !== null && responseFilters.month !== filters.month) throw new Error("Filtros divergentes na resposta epidemiológica.");
  return {
    metric: "notifications", geography: "MUNICIPALITY", filters,
    totalNotifications: typeof x.totalNotifications === "number" ? x.totalNotifications : null,
    coverage: typeof x.coverage === "object" && x.coverage !== null ? x.coverage as EpidemiologyResponse["coverage"] : { status: "PARTIAL", mappedNotificationsTotal: 0, unmappedNotificationsTotal: 0 },
    items,
  };
}

export const apiDataSource: EpidemiologyDataSource = {
  async listDiseases() {
    const value = await getJson("/diseases");
    if (!value || typeof value !== "object" || !Array.isArray((value as { items?: unknown }).items)) throw new Error("Lista de doenças inválida.");
    return (value as { items: unknown[] }).items.filter((item): item is string => typeof item === "string");
  },
  async getMetadata() {
    const value = await getJson("/metadata");
    if (!value || typeof value !== "object") throw new Error("Metadata inválida.");
    return value as { availableYears: number[]; availableMonthsByYear: Record<string, number[]> };
  },
  async getEpidemiology(request: EpidemiologyRequest): Promise<EpidemiologyResponse> {
    const params = new URLSearchParams({ geography: request.geography, disease: request.disease });
    if (request.year !== "ALL") params.set("year", String(request.year));
    if (request.month !== "ALL") params.set("month", String(request.month));
    if (request.sex) params.set("sex", request.sex);
    if (request.ageBand) params.set("ageBand", request.ageBand);
    if (request.municipalityCode) params.set("municipalityCode", request.municipalityCode);
    if (request.districtCode) params.set("districtCode", request.districtCode);
    const endpoint = request.geography === "MUNICIPALITY" ? "municipalities" : request.geography.toLowerCase();
    const value = await getJson(`/epidemiology/${endpoint}?${params}`);
    return parseCases(value, request);
  },
};
