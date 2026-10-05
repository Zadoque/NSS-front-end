import type { FeatureCollection, Geometry } from "geojson";
import districtsMap from "./campos-districts.json";
import neighborhoodsMap from "./campos-neighborhoods.json";
import { municipalities } from "./coverage";
import type { EpidemiologyDataSource, EpidemiologyRequest, EpidemiologyResponse, EpidemiologyItem } from "../types/epidemiology";

type TerritoryProperties = { territoryId: string; name: string; parentDistrictId?: string };
const districts = (districtsMap as FeatureCollection<Geometry, TerritoryProperties>).features;
const neighborhoods = (neighborhoodsMap as FeatureCollection<Geometry, TerritoryProperties>).features;

function response(request: EpidemiologyRequest, items: EpidemiologyItem[], total: number | null, mapped: number, unmapped: number, status: "AVAILABLE" | "UNAVAILABLE" | "PARTIAL"): EpidemiologyResponse {
  return { metric: "notifications", geography: request.geography, filters: { disease: request.disease, year: request.year, month: request.month, ...(request.sex ? { sex: request.sex } : {}), ...(request.ageBand ? { ageBand: request.ageBand } : {}) }, totalNotifications: total, coverage: { status, mappedNotificationsTotal: mapped, unmappedNotificationsTotal: unmapped } , items };
}

export const mockDataSource: EpidemiologyDataSource = {
  async listDiseases() { return ["DENG", "FMAC", "TOXC"]; },
  async getMetadata() { return { availableYears: [2023, 2024, 2025, 2026], availableMonthsByYear: { "2023": Array.from({ length: 12 }, (_, i) => i + 1), "2024": Array.from({ length: 12 }, (_, i) => i + 1), "2025": Array.from({ length: 12 }, (_, i) => i + 1), "2026": Array.from({ length: 10 }, (_, i) => i + 1) } }; },
  async getEpidemiology(request) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (request.geography === "MUNICIPALITY") {
      const items = municipalities.map((item) => ({ code: item.cdMun, name: item.nmMun, notificationsTotal: item.casesTotal }));
      return response(request, items, 265, 265, 0, "AVAILABLE");
    }
    if (request.geography === "DISTRICT" && request.municipalityCode === "3301009") {
      const items = districts.map((feature, index) => ({ code: String(feature.properties?.territoryId), name: String(feature.properties?.name), notificationsTotal: index === 0 ? 27 : index % 3 === 0 ? 0 : 4 + index }));
      return response(request, items, 120, 114, 6, "PARTIAL");
    }
    if (request.geography === "NEIGHBORHOOD" && request.municipalityCode === "3301009" && request.districtCode === "CG_DIST_SEDE") {
      const items = neighborhoods.filter((feature) => feature.properties?.parentDistrictId === request.districtCode).map((feature, index) => ({ code: String(feature.properties?.territoryId), name: String(feature.properties?.name), notificationsTotal: index === 0 ? 0 : 1 + (index % 5), parentDistrictId: request.districtCode }));
      const mapped = items.reduce((total, item) => total + item.notificationsTotal, 0);
      return response(request, items, mapped + 2, mapped, 2, "PARTIAL");
    }
    return response(request, [], null, 0, 0, "UNAVAILABLE");
  },
};
