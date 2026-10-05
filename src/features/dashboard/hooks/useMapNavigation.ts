import { useState } from "react";
import { demoCoverage } from "../../../data/coverage";
import type { GeographySelection, MapLevel } from "../../../types/epidemiology";

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
    if (selection.level === "region") {
      setNavigation({
        mapLevel: demoCoverage.drilldownEnabled.regions.includes(selection.code)
          ? "SOUTHEAST_STATES"
          : "BRAZIL_REGIONS",
        selectedGeography: demoCoverage.drilldownEnabled.regions.includes(
          selection.code,
        )
          ? null
          : selection,
      });
    } else if (selection.level === "state") {
      setNavigation({
        mapLevel: demoCoverage.drilldownEnabled.states.includes(selection.code)
          ? "RJ_MUNICIPALITIES"
          : "SOUTHEAST_STATES",
        selectedGeography: demoCoverage.drilldownEnabled.states.includes(
          selection.code,
        )
          ? null
          : selection,
      });
    } else if (selection.level === "municipality") {
      if (selection.code === "3301009") {
        setNavigation({ mapLevel: "CAMPOS_DISTRICTS", selectedGeography: selection });
      } else {
        setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: selection });
      }
    } else if (selection.level === "district") {
      // Na V1, o detalhamento por bairro da notificação está disponível
      // somente para o Distrito Sede. Os demais distritos continuam no mapa
      // distrital; isso não significa zero nem território não mapeado.
      setNavigation({
        mapLevel:
          selection.code === "CG_DIST_SEDE"
            ? "CAMPOS_NEIGHBORHOODS"
            : "CAMPOS_DISTRICTS",
        selectedGeography: selection,
      });
    } else {
      setNavigation({
        mapLevel: "CAMPOS_NEIGHBORHOODS",
        selectedGeography: selection,
      });
    }
  }
  function goBack() {
    const current = navigation.selectedGeography;
    const camposMunicipality: GeographySelection = {
      level: "municipality",
      code: "3301009",
      name: "Campos dos Goytacazes",
    };
    const municipality =
      current?.level === "municipality"
        ? current
        : current?.municipalityCode === "3301009"
          ? camposMunicipality
          : null;

    if (navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") {
      setNavigation({ mapLevel: "CAMPOS_DISTRICTS", selectedGeography: municipality });
    } else if (navigation.mapLevel === "CAMPOS_DISTRICTS") {
      setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: municipality });
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
    navigation.mapLevel === "RJ_MUNICIPALITIES"
      ? "RJ"
      : navigation.selectedGeography?.level === "state"
        ? navigation.selectedGeography.code
        : "";
  return { ...navigation, region, state, navigate, select, goBack };
}
