import { useState } from "react";
import type { GeographySelection, MapLevel } from "../domain/epidemiologyTypes";
import {
  CAMPOS_MUNICIPALITY_CODE,
  canDrillDown,
  camposMunicipalitySelection,
  mapLevelForSelection,
} from "../geography/geographyDomain";

type Navigation = {
  mapLevel: MapLevel;
  selectedGeography: GeographySelection | null;
};
export function useMapNavigation() {
  const [navigation, setNavigation] = useState<Navigation>({
    mapLevel: "BRAZIL_REGIONS",
    selectedGeography: null,
  });
  function navigate(mapLevel: MapLevel) {
    setNavigation({ mapLevel, selectedGeography: null });
  }
  function select(selection: GeographySelection) {
    const mapLevel = mapLevelForSelection(selection);
    setNavigation({
      mapLevel,
      selectedGeography:
        (selection.level === "region" || selection.level === "state") && canDrillDown(selection)
          ? null
          : selection,
    });
  }
  function goBack() {
    const current = navigation.selectedGeography;
    const camposMunicipality = camposMunicipalitySelection();
    const municipality =
      current?.level === "municipality"
        ? current
        : current?.municipalityCode === CAMPOS_MUNICIPALITY_CODE
          ? camposMunicipality
          : null;

    if (navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") {
      setNavigation({ mapLevel: "CAMPOS_DISTRICTS", selectedGeography: municipality });
    } else if (navigation.mapLevel === "CAMPOS_DISTRICTS") {
      // A seleção de Campos só dá contexto aos níveis territoriais internos.
      // Ao retornar ao mapa estadual, mantê-la ativa restringiria indevidamente
      // a consulta municipal ao código 3301009.
      setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: null });
    } else if (navigation.mapLevel === "RJ_MUNICIPALITIES") {
      setNavigation({ mapLevel: "SOUTHEAST_STATES", selectedGeography: null });
    } else if (navigation.mapLevel === "SOUTHEAST_STATES") {
      setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
    }
  }
  const region =
    navigation.mapLevel !== "BRAZIL_REGIONS"
      ? "SE"
      : (navigation.selectedGeography?.code ?? "");
  const state =
    ["RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS"].includes(navigation.mapLevel)
      ? "RJ"
      : navigation.selectedGeography?.level === "state"
        ? navigation.selectedGeography.code
        : "";
  return { ...navigation, region, state, navigate, select, goBack };
}
