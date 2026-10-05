import type { FeatureCollection } from "geojson";
import type { MapLevel } from "../types/epidemiology";
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
  RJ_MUNICIPALITIES: {
    file: "rj-municipalities",
    title: "Rio de Janeiro",
    center: [-42.5, -22.1],
    scale: 7800,
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
};
export async function loadMap(level: MapLevel): Promise<FeatureCollection> {
  const response = await fetch(
    `${import.meta.env.BASE_URL}maps/${mapViews[level].file}.geojson`,
  );
  if (!response.ok) throw new Error("Não foi possível carregar a cartografia.");
  const data = (await response.json()) as FeatureCollection;
  if (data.type !== "FeatureCollection" || !data.features?.length)
    throw new Error("Cartografia inválida.");
  return data;
}
