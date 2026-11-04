import type { GeographySelection, MapLevel } from "../domain/epidemiologyTypes";

export const CAMPOS_MUNICIPALITY_CODE = "3301009";
export const CAMPOS_MUNICIPALITY_NAME = "Campos dos Goytacazes";
export const CAMPOS_SEAT_DISTRICT_CODE = "CG_DIST_SEDE";
export const CAMPOS_SEAT_DISTRICT_NAME = "Distrito Sede";

export const stateRegion: Record<string, string> = {
  "11": "N", "12": "N", "13": "N", "14": "N", "15": "N", "16": "N", "17": "N",
  "21": "NE", "22": "NE", "23": "NE", "24": "NE", "25": "NE", "26": "NE", "27": "NE", "28": "NE", "29": "NE",
  "31": "SE", "32": "SE", "33": "SE", "35": "SE",
  "41": "S", "42": "S", "43": "S", "50": "CO", "51": "CO", "52": "CO", "53": "CO",
};

export const geographyCapabilities = {
  drilldownRegions: ["N", "NE", "CO", "SE", "S"] as const,
  drilldownStates: [...Object.keys(stateRegion), "RJ"] as const,
  coveredMunicipalities: [] as string[],
} as const;

export function canDrillDown(selection: GeographySelection) {
  if (selection.level === "region") return geographyCapabilities.drilldownRegions.includes(selection.code as typeof geographyCapabilities.drilldownRegions[number]);
  if (selection.level === "state") return true;
  return false;
}

export function isCoveredMunicipality(code: string) {
  return geographyCapabilities.coveredMunicipalities.includes(code as (typeof geographyCapabilities.coveredMunicipalities)[number]);
}

export function mapLevelForSelection(selection: GeographySelection): MapLevel {
  switch (selection.level) {
    case "region":
      return canDrillDown(selection) ? "SOUTHEAST_STATES" : "BRAZIL_REGIONS";
    case "state":
      return selection.code === "RJ" || selection.code === "33" ? "RJ_MUNICIPALITIES" : "NATIONAL_MUNICIPALITIES";
    case "municipality": return selection.code === CAMPOS_MUNICIPALITY_CODE ? "CAMPOS_DISTRICTS" : "MUNICIPALITY_NEIGHBORHOODS";
    case "district":
      return selection.code === CAMPOS_SEAT_DISTRICT_CODE ? "CAMPOS_NEIGHBORHOODS" : "MUNICIPALITY_NEIGHBORHOODS";
    case "neighborhood": return selection.municipalityCode === CAMPOS_MUNICIPALITY_CODE ? "CAMPOS_NEIGHBORHOODS" : "MUNICIPALITY_NEIGHBORHOODS";
  }
}

export function nationalMapLevelForSelection(selection: GeographySelection): MapLevel {
  if (selection.level === "region") return "NATIONAL_STATES";
  if (selection.level === "state") return "NATIONAL_MUNICIPALITIES";
  if (selection.level === "municipality") return "MUNICIPALITY_NEIGHBORHOODS";
  return "MUNICIPALITY_NEIGHBORHOODS";
}

export function camposMunicipalitySelection(): GeographySelection {
  return { level: "municipality", code: CAMPOS_MUNICIPALITY_CODE, name: CAMPOS_MUNICIPALITY_NAME };
}

export function territoryScope(selection: GeographySelection | null, mapLevel?: MapLevel) {
  const internalCampos = mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS";
  return {
    municipalityCode:
      internalCampos || selection?.level === "district" || selection?.level === "neighborhood"
        ? selection?.municipalityCode ?? (internalCampos ? CAMPOS_MUNICIPALITY_CODE : undefined)
        : undefined,
    districtCode:
      selection?.level === "neighborhood"
        ? selection.districtCode
        : selection?.level === "district"
          ? selection.code
          : undefined,
  };
}
