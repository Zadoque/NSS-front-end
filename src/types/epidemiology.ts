export type GeographyLevel = "REGION" | "STATE" | "MUNICIPALITY" | "DISTRICT" | "NEIGHBORHOOD";
export type CoverageStatus = "AVAILABLE" | "UNAVAILABLE" | "PARTIAL";
export type Metric = "notifications";
export type Sex = "M" | "F" | "I";
export type AgeBand = "LT1" | "01_04" | "05_09" | "10_14" | "15_19" | "20_39" | "40_59" | "60_64" | "65_69" | "70_74" | "75_79" | "80_PLUS";
export type EpidemiologyFilters = { disease: string; year: number; month: number; sex?: "M" | "F"; ageBand?: AgeBand };
export type EpidemiologyRequest = EpidemiologyFilters & { geography: GeographyLevel; municipalityCode?: string; districtCode?: string };
export type Coverage = { status: CoverageStatus; mappedNotificationsTotal: number; unmappedNotificationsTotal: number };
export type EpidemiologyItem = { code: string; name: string; notificationsTotal: number; parentDistrictId?: string };
export type EpidemiologyResponse = { metric: Metric; geography: GeographyLevel; filters: EpidemiologyFilters; totalNotifications: number | null; coverage: Coverage; items: EpidemiologyItem[] };
export type MunicipalityCases = EpidemiologyItem & { cdUf: string; nmUf: string; cdMun: string; nmMun: string; casesTotal: number };
export type MunicipalityCasesResponse = EpidemiologyResponse & { items: MunicipalityCases[] };
export interface EpidemiologyDataSource {
  listDiseases(): Promise<string[]>;
  getMetadata(): Promise<{ availableYears: number[]; availableMonthsByYear: Record<string, number[]> }>;
  getEpidemiology(request: EpidemiologyRequest): Promise<EpidemiologyResponse>;
}
export type MapLevel =
  "BRAZIL_REGIONS" | "SOUTHEAST_STATES" | "RJ_MUNICIPALITIES" | "CAMPOS_DISTRICTS" | "CAMPOS_NEIGHBORHOODS";
export type GeographySelection = {
  level: "region" | "state" | "municipality" | "district" | "neighborhood";
  code: string;
  name: string;
  municipalityCode?: string;
  districtCode?: string;
};
