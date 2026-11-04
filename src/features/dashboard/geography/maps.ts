import type { FeatureCollection } from "geojson";
import type { MapLevel } from "../domain/epidemiologyTypes";
export const mapViews: Record<
  MapLevel,
  { file: string; title: string; center: [number, number]; scale: number }
> = {
  BRAZIL_REGIONS: {
    file: "brazil-regions",
    title: "Brasil",
    center: [-54, -15],
    scale: 650,
  },
  SOUTHEAST_STATES: {
    file: "southeast-states",
    title: "Sudeste",
    center: [-45, -20],
    scale: 2200,
  },
  NATIONAL_STATES: {
    file: "national/states",
    title: "Estados do Brasil",
    center: [-54, -15],
    scale: 650,
  },
  RJ_MUNICIPALITIES: {
    file: "rj-municipalities",
    title: "Rio de Janeiro",
    center: [-42.5, -22.1],
    scale: 7800,
  },
  NATIONAL_MUNICIPALITIES: {
    file: "national/municipalities",
    title: "Municípios do Brasil",
    center: [-54, -15],
    scale: 6000,
  },
  CAMPOS_DISTRICTS: {
    file: "campos-districts",
    title: "Distritos de Campos dos Goytacazes",
    center: [-41.35, -21.75],
    scale: 32000,
  },
  CAMPOS_NEIGHBORHOODS: {
    file: "campos-neighborhoods",
    title: "Bairros/localidades da notificação",
    center: [-41.35, -21.75],
    scale: 65000,
  },
  MUNICIPALITY_NEIGHBORHOODS: {
    file: "",
    title: "Bairros da notificação",
    center: [-54, -15],
    scale: 65000,
  },
  MUNICIPALITY_DISTRICTS: {
    file: "",
    title: "Distritos do município",
    center: [-43, -22.5],
    scale: 30000,
  },
};
const stateUf: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};
export type MunicipalityMapIndexItem = { code: string; name: string; uf: string; path: string; geometryStatus?: string; neighborhoodsPath?: string; neighborhoodCount?: number; neighborhoodGeometryStatus?: string };

export async function loadMap(level: MapLevel, code?: string): Promise<FeatureCollection> {
  const file = level === "MUNICIPALITY_DISTRICTS"
    ? `national/districts/${code ?? ""}`
    : level === "MUNICIPALITY_NEIGHBORHOODS"
    ? `national/neighborhoods/${code ?? ""}`
    : level === "NATIONAL_MUNICIPALITIES" && code
      ? `national/municipalities-by-state/${stateUf[code] ?? code}`
      : mapViews[level].file;
  const response = await fetch(
    `${import.meta.env.BASE_URL}maps/${file}.geojson`,
  );
  if (!response.ok) throw new Error("Não foi possível carregar a cartografia.");
  const data = (await response.json()) as FeatureCollection;
  if (data.type !== "FeatureCollection" || (!data.features?.length && !["MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(level)))
    throw new Error("Cartografia inválida.");
  if (level === "NATIONAL_STATES" && code) {
    data.features = data.features.filter((feature) => feature.properties?.abbrev_region === code);
  }
  return data;
}

export async function loadMunicipalityIndex(): Promise<MunicipalityMapIndexItem[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}maps/national/municipalities.index.json`);
  if (!response.ok) throw new Error("Não foi possível carregar o catálogo municipal.");
  const data = (await response.json()) as { items?: MunicipalityMapIndexItem[] };
  if (!Array.isArray(data.items) || data.items.length < 5570) throw new Error("Catálogo municipal inválido.");
  return data.items;
}
