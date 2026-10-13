import { getJson } from "../api/http";
import type { EpidemiologyDataSource, EpidemiologyRequest, EpidemiologyResponse } from "../types/epidemiology";
import { diseasesResponseSchema, epidemiologyResponseSchema, metadataResponseSchema } from "../features/dashboard/api/epidemiologySchemas";

export function parseCases(value: unknown, request: EpidemiologyRequest): EpidemiologyResponse {
  const parsed = epidemiologyResponseSchema.safeParse(value);
  if (!parsed.success) throw new Error("Resposta epidemiológica inválida.");
  const items = parsed.data.items.map((item) => "code" in item
    ? { code: item.code, name: item.name, notificationsTotal: item.notificationsTotal }
    : { code: item.cdMun, name: item.nmMun, notificationsTotal: item.casesTotal, cdMun: item.cdMun, nmMun: item.nmMun, casesTotal: item.casesTotal });
  if (new Set(items.map((item) => item.code)).size !== items.length) throw new Error("Territórios duplicados na resposta epidemiológica.");
  const responseFilters = parsed.data.filters ?? parsed.data;
  if (responseFilters?.year !== undefined && responseFilters.year !== request.year) throw new Error("Filtros divergentes na resposta epidemiológica.");
  if (responseFilters?.month !== undefined && responseFilters.month !== request.month) throw new Error("Filtros divergentes na resposta epidemiológica.");
  return {
    metric: "notifications", geography: request.geography, filters: request,
    totalNotifications: parsed.data.totalNotifications ?? null,
    coverage: parsed.data.coverage ?? { status: "PARTIAL", mappedNotificationsTotal: 0, unmappedNotificationsTotal: 0 },
    items,
  };
}

export const apiDataSource: EpidemiologyDataSource = {
  async listDiseases() {
    const value = await getJson("/diseases");
    const parsed = diseasesResponseSchema.safeParse(value);
    if (!parsed.success) throw new Error("Lista de doenças inválida.");
    return parsed.data.items;
  },
  async getMetadata() {
    const value = await getJson("/metadata");
    const parsed = metadataResponseSchema.safeParse(value);
    if (!parsed.success) throw new Error("Metadata inválida.");
    return parsed.data;
  },
  async getEpidemiology(request: EpidemiologyRequest): Promise<EpidemiologyResponse> {
    const params = new URLSearchParams({ geography: request.geography, disease: request.disease });
    if (request.year !== "ALL") params.set("year", String(request.year));
    if (request.month !== "ALL") params.set("month", String(request.month));
    if (request.sex) params.set("sex", request.sex);
    if (request.ageBand) params.set("ageBand", request.ageBand);
    if (request.municipalityCode) params.set("municipalityCode", request.municipalityCode);
    if (request.districtCode) params.set("districtCode", request.districtCode);
    const endpoint = request.geography === "MUNICIPALITY"
      ? "municipalities"
      : request.geography === "DISTRICT"
        ? "districts"
        : request.geography === "NEIGHBORHOOD"
          ? "neighborhoods"
          : request.geography.toLowerCase();
    const value = await getJson(`/epidemiology/${endpoint}?${params}`);
    return parseCases(value, request);
  },
};
