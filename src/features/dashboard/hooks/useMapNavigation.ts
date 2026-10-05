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
      setNavigation({ mapLevel: "CAMPOS_NEIGHBORHOODS", selectedGeography: selection });
    } else {
      setNavigation({
        mapLevel: "CAMPOS_NEIGHBORHOODS",
        selectedGeography: selection,
      });
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
  return { ...navigation, region, state, navigate, select };
}
