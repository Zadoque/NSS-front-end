import { getJson } from "../api/http";
import type { EpidemiologyDataSource, EpidemiologyRequest, EpidemiologyResponse } from "../types/epidemiology";

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
    const params = new URLSearchParams({ geography: request.geography, disease: request.disease, year: String(request.year), month: String(request.month) });
    if (request.sex) params.set("sex", request.sex);
    if (request.ageBand) params.set("ageBand", request.ageBand);
    if (request.municipalityCode) params.set("municipalityCode", request.municipalityCode);
    if (request.districtCode) params.set("districtCode", request.districtCode);
    const value = await getJson(`/epidemiology/${request.geography.toLowerCase()}?${params}`);
    return value as EpidemiologyResponse;
  },
};
