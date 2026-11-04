import { useState } from "react";
import { isDemo } from "../api/sources/dataSource";
import type { GeographySelection, MapLevel } from "../domain/epidemiologyTypes";
import {
  CAMPOS_MUNICIPALITY_CODE,
  canDrillDown,
  camposMunicipalitySelection,
  mapLevelForSelection,
  nationalMapLevelForSelection,
  stateRegion,
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
    if (isDemo && selection.level === "region" && selection.code !== "SE") {
      setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: selection });
      return;
    }
    if (!isDemo && selection.level === "region") {
      setNavigation({
        mapLevel: selection.code === "SE" ? "SOUTHEAST_STATES" : nationalMapLevelForSelection(selection),
        selectedGeography: selection.code === "SE" ? null : selection,
      });
      return;
    }
    if (isDemo && selection.level === "state") {
      if (selection.code === "RJ") {
        setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: null });
      } else {
        setNavigation({ mapLevel: "SOUTHEAST_STATES", selectedGeography: selection });
      }
      return;
    }
    if (!isDemo && selection.level === "state" && navigation.mapLevel === "NATIONAL_STATES") {
      setNavigation({ mapLevel: "NATIONAL_MUNICIPALITIES", selectedGeography: selection });
      return;
    }
    if (!isDemo && selection.level === "municipality" && navigation.mapLevel === "NATIONAL_MUNICIPALITIES") {
      setNavigation({ mapLevel: selection.code === CAMPOS_MUNICIPALITY_CODE ? "CAMPOS_DISTRICTS" : "MUNICIPALITY_DISTRICTS", selectedGeography: selection });
      return;
    }
    if (!isDemo && selection.level === "state" && navigation.mapLevel === "SOUTHEAST_STATES") {
      setNavigation({ mapLevel: selection.code === "RJ" || selection.code === "33" ? "RJ_MUNICIPALITIES" : "NATIONAL_MUNICIPALITIES", selectedGeography: selection.code === "RJ" || selection.code === "33" ? null : selection });
      return;
    }
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
    if (!isDemo) {
      if (navigation.mapLevel === "MUNICIPALITY_NEIGHBORHOODS") {
        const municipalityCode = current?.municipalityCode;
        setNavigation({ mapLevel: "MUNICIPALITY_DISTRICTS", selectedGeography: municipalityCode ? { level: "municipality", code: municipalityCode, name: "Município selecionado" } : null });
      } else if (navigation.mapLevel === "MUNICIPALITY_DISTRICTS") {
        const municipalityCode = current?.level === "municipality" ? current.code : current?.municipalityCode;
        const ufCode = municipalityCode?.slice(0, 2);
        setNavigation({
          mapLevel: "NATIONAL_MUNICIPALITIES",
          selectedGeography: current?.level === "state"
            ? current
            : ufCode
              ? { level: "state", code: ufCode, name: "Estado selecionado" }
              : null,
        });
      } else if (navigation.mapLevel === "NATIONAL_MUNICIPALITIES") {
        setNavigation({ mapLevel: "NATIONAL_STATES", selectedGeography: current?.level === "state" ? current : null });
      } else if (navigation.mapLevel === "NATIONAL_STATES") {
        setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
      } else if (navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") {
        setNavigation({ mapLevel: "CAMPOS_DISTRICTS", selectedGeography: null });
      } else if (navigation.mapLevel === "CAMPOS_DISTRICTS") {
        setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: null });
      } else if (navigation.mapLevel === "RJ_MUNICIPALITIES") {
        setNavigation({ mapLevel: "SOUTHEAST_STATES", selectedGeography: null });
      } else if (navigation.mapLevel === "SOUTHEAST_STATES") {
        setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
      }
      return;
    }
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
    navigation.mapLevel === "NATIONAL_STATES" && navigation.selectedGeography?.level === "region"
      ? navigation.selectedGeography.code
      : navigation.mapLevel === "NATIONAL_MUNICIPALITIES" && navigation.selectedGeography?.level === "state"
        ? stateRegion[navigation.selectedGeography.code] ?? ""
        : navigation.mapLevel !== "BRAZIL_REGIONS" ? "SE" : (navigation.selectedGeography?.code ?? "");
  const state =
    ["RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS"].includes(navigation.mapLevel)
      ? "RJ"
      : ["MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"].includes(navigation.mapLevel)
        ? (navigation.selectedGeography?.municipalityCode ?? navigation.selectedGeography?.code)?.slice(0, 2) ?? ""
      : navigation.selectedGeography?.level === "state"
        ? navigation.selectedGeography.code
        : "";
  return { ...navigation, region, state, navigate, select, goBack };
}
