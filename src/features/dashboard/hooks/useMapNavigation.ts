import { useState } from "react";
import { demoCoverage } from "../../../data/coverage";
import { isDemo } from "../../../data/dataSource";
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
      setNavigation({ mapLevel: !isDemo && selection.code === "SE" ? "SOUTHEAST_STATES" : "NATIONAL_STATES", selectedGeography: !isDemo && selection.code === "SE" ? null : selection });
      return;
    }
    if (selection.level === "state" && navigation.mapLevel === "NATIONAL_STATES") {
      setNavigation({ mapLevel: "NATIONAL_MUNICIPALITIES", selectedGeography: selection });
      return;
    }
    if (selection.level === "municipality" && navigation.mapLevel === "NATIONAL_MUNICIPALITIES") {
      setNavigation({ mapLevel: "MUNICIPALITY_NEIGHBORHOODS", selectedGeography: selection });
      return;
    }
    if (!isDemo) {
      if (selection.level === "state" && selection.code === "RJ" && navigation.mapLevel === "SOUTHEAST_STATES") {
        setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: null });
      } else if (selection.level === "state") {
        setNavigation({ mapLevel: "NATIONAL_MUNICIPALITIES", selectedGeography: selection });
      } else if (selection.level === "municipality") {
        if (navigation.mapLevel === "RJ_MUNICIPALITIES") {
          setNavigation({ mapLevel: selection.code === "3301009" ? "CAMPOS_DISTRICTS" : "RJ_MUNICIPALITIES", selectedGeography: selection });
        } else {
          setNavigation({ mapLevel: "MUNICIPALITY_NEIGHBORHOODS", selectedGeography: selection });
        }
      } else if (selection.level === "district" && navigation.mapLevel === "CAMPOS_DISTRICTS") {
        setNavigation({ mapLevel: selection.code === "CG_DIST_SEDE" ? "CAMPOS_NEIGHBORHOODS" : "CAMPOS_DISTRICTS", selectedGeography: selection });
      } else if (selection.level === "neighborhood" && navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") {
        setNavigation({ mapLevel: "CAMPOS_NEIGHBORHOODS", selectedGeography: selection });
      } else {
        setNavigation({ mapLevel: "MUNICIPALITY_NEIGHBORHOODS", selectedGeography: selection });
      }
      return;
    }
    if (selection.level === "state") {
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
    if (navigation.mapLevel === "MUNICIPALITY_NEIGHBORHOODS") {
      const current = navigation.selectedGeography;
      const municipalityCode = current?.level === "municipality" ? current.code : current?.municipalityCode;
      setNavigation({ mapLevel: "NATIONAL_MUNICIPALITIES", selectedGeography: municipalityCode ? { level: "municipality", code: municipalityCode, name: current?.level === "municipality" ? current.name : "Município selecionado" } : null });
      return;
    }
    if (navigation.mapLevel === "NATIONAL_MUNICIPALITIES") {
      setNavigation({ mapLevel: "NATIONAL_STATES", selectedGeography: navigation.selectedGeography?.level === "state" ? null : null });
      return;
    }
    if (!isDemo) {
      if (navigation.mapLevel === "NATIONAL_STATES") {
        setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
      } else if (navigation.mapLevel === "CAMPOS_NEIGHBORHOODS") {
        setNavigation({ mapLevel: "CAMPOS_DISTRICTS", selectedGeography: null });
      } else if (navigation.mapLevel === "CAMPOS_DISTRICTS") {
        setNavigation({ mapLevel: "RJ_MUNICIPALITIES", selectedGeography: null });
      } else if (navigation.mapLevel === "RJ_MUNICIPALITIES") {
        setNavigation({ mapLevel: "SOUTHEAST_STATES", selectedGeography: null });
      } else if (navigation.mapLevel === "SOUTHEAST_STATES") {
        setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
      } else {
        setNavigation({ mapLevel: "BRAZIL_REGIONS", selectedGeography: null });
      }
      return;
    }
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
  const stateRegion: Record<string, string> = { "11":"N", "12":"N", "13":"N", "14":"N", "15":"N", "16":"N", "17":"N", "21":"NE", "22":"NE", "23":"NE", "24":"NE", "25":"NE", "26":"NE", "27":"NE", "28":"NE", "29":"NE", "31":"SE", "32":"SE", "33":"SE", "35":"SE", "41":"S", "42":"S", "43":"S", "50":"CO", "51":"CO", "52":"CO", "53":"CO" };
  const region =
    navigation.mapLevel === "NATIONAL_STATES" && navigation.selectedGeography?.level === "region"
      ? navigation.selectedGeography.code
      : navigation.mapLevel === "NATIONAL_MUNICIPALITIES" && navigation.selectedGeography?.level === "state"
        ? stateRegion[navigation.selectedGeography.code] ?? ""
        : navigation.mapLevel !== "BRAZIL_REGIONS" ? "SE" : (navigation.selectedGeography?.code ?? "");
  const state =
    ["RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS"].includes(navigation.mapLevel)
      ? "RJ"
      : navigation.selectedGeography?.level === "state"
        ? navigation.selectedGeography.code
        : "";
  return { ...navigation, region, state, navigate, select, goBack };
}
