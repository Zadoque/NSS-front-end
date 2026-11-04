import { useState } from "react";
import { isDemo } from "../api/sources/dataSource";
import { mapViews } from "../geography/maps";
import type { EpidemiologyFilters } from "../domain/epidemiologyTypes";
import { useDiseases, useEpidemiologyQuery, useMetadata } from "./useEpidemiologyQuery";
import { useMapNavigation } from "./useMapNavigation";
import { isCoveredMunicipality, CAMPOS_SEAT_DISTRICT_CODE, territoryScope } from "../geography/geographyDomain";

export function useDashboardModel() {
  const navigation = useMapNavigation();
  const { mapLevel, selectedGeography, select, navigate, goBack } = navigation;
  const diseases = useDiseases();
  const metadata = useMetadata();
  const [filterInput, setFilters] = useState<EpidemiologyFilters>({ disease: "DENG", year: 2026, month: 1 });
  const filters = {
    ...filterInput,
    disease: diseases.data?.includes(filterInput.disease) ? filterInput.disease : (diseases.data?.[0] ?? ""),
  };
  const geography = mapLevel === "NATIONAL_STATES" ? "STATE" : mapLevel === "CAMPOS_DISTRICTS" ? "DISTRICT" : ["CAMPOS_NEIGHBORHOODS", "MUNICIPALITY_NEIGHBORHOODS"].includes(mapLevel) ? "NEIGHBORHOOD" : ["RJ_MUNICIPALITIES", "NATIONAL_MUNICIPALITIES"].includes(mapLevel) ? "MUNICIPALITY" : "REGION";
  const scope = territoryScope(selectedGeography, mapLevel);
  const query = useEpidemiologyQuery({
    ...filters,
    geography,
    ...scope,
    municipalityCode: mapLevel === "MUNICIPALITY_NEIGHBORHOODS" ? selectedGeography?.municipalityCode : scope.municipalityCode,
    districtCode: mapLevel === "MUNICIPALITY_NEIGHBORHOODS" ? selectedGeography?.districtCode : scope.districtCode,
    ufCode: mapLevel === "NATIONAL_MUNICIPALITIES" && selectedGeography?.level === "state" ? selectedGeography.code : undefined,
  });
  const items = query.isSuccess ? query.data.items : [];
  const municipal = mapLevel === "RJ_MUNICIPALITIES" || mapLevel === "NATIONAL_MUNICIPALITIES";
  const territorial = municipal || mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS" || mapLevel === "MUNICIPALITY_NEIGHBORHOODS";
  const covered = selectedGeography?.level === "district" || selectedGeography?.level === "neighborhood"
    ? true
    : selectedGeography?.level === "municipality" && (mapLevel === "NATIONAL_MUNICIPALITIES" || mapLevel === "MUNICIPALITY_NEIGHBORHOODS" || isCoveredMunicipality(selectedGeography.code));
  const selectedItem = items.find((item) => item.code === selectedGeography?.code);
  const selectedTotal = (selectedGeography?.level === "municipality" && geography === "DISTRICT") || (selectedGeography?.level === "district" && geography === "NEIGHBORHOOD")
    ? query.data?.totalNotifications
    : selectedItem?.notificationsTotal;
  const periodDescription = filters.year === "ALL" && filters.month === "ALL" ? "no período selecionado" : filters.month === "ALL" ? "no ano selecionado" : filters.year === "ALL" ? "no mês selecionado em todos os anos" : "no mês selecionado";
  const selectionInfo = selectedGeography
    ? selectedGeography.level === "district" && selectedGeography.code !== CAMPOS_SEAT_DISTRICT_CODE
      ? "Detalhamento por bairro da notificação indisponível neste distrito. O total distrital permanece disponível."
      : !covered ? "Sem cobertura nesta V1. Dados ainda não disponíveis."
      : query.isError ? "Não foi possível consultar os dados."
      : query.isPending ? "Carregando dados…"
      : selectedTotal !== undefined && selectedTotal !== null ? `${selectedTotal} notificações da unidade notificadora ${periodDescription}.`
      : "Sem registros neste recorte. Isso não equivale a zero casos."
    : territorial ? "Selecione um município, distrito ou bairro da notificação para consultar."
    : "Explore o Sudeste e o Rio de Janeiro. Cobertura parcial, sem total agregado.";
  const panel = {
    municipal,
    filters,
    onChange: setFilters,
    diseases: diseases.data ?? [],
    diseasesLoading: diseases.isPending,
    diseasesError: diseases.isError,
    retryDiseases: () => { void diseases.refetch(); },
    selectionName: selectedGeography?.name ?? mapViews[mapLevel].title,
    selectionInfo,
    demo: isDemo,
    availableYears: metadata.data?.availableYears ?? [],
    availableMonths: filters.year === "ALL" ? Array.from({ length: 12 }, (_, index) => index + 1) : metadata.data?.availableMonthsByYear[String(filters.year)] ?? [],
  };
  return { navigation, mapLevel, selectedGeography, select, navigate, goBack, diseases, metadata, filters, geography, query, items, municipal, territorial, selectionInfo, panel };
}
