import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isDemo } from "../api/sources/dataSource";
import { mapViews } from "../geography/maps";
import type { EpidemiologyFilters } from "../domain/epidemiologyTypes";
import { useDiseases, useEpidemiologyQuery, useMetadata } from "./useEpidemiologyQuery";
import { useMapNavigation } from "./useMapNavigation";
import { canExpandToNeighborhoods, isCoveredMunicipality, territoryScope, CAMPOS_MUNICIPALITY_CODE } from "../geography/geographyDomain";
import { loadMap } from "../geography/maps";

export function useDashboardModel() {
  const navigation = useMapNavigation();
  const { mapLevel, selectedGeography, select, navigate } = navigation;
  const diseases = useDiseases();
  const metadata = useMetadata();
  const [filterInput, setFilters] = useState<EpidemiologyFilters>({ disease: "DENG", year: 2026, month: 1 });
  const filters = {
    ...filterInput,
    disease: diseases.data?.includes(filterInput.disease) ? filterInput.disease : (diseases.data?.[0] ?? ""),
  };
  const geography = mapLevel === "NATIONAL_STATES" || mapLevel === "SOUTHEAST_STATES" ? "STATE" : ["CAMPOS_DISTRICTS", "MUNICIPALITY_DISTRICTS"].includes(mapLevel) ? "DISTRICT" : ["CAMPOS_NEIGHBORHOODS", "MUNICIPALITY_NEIGHBORHOODS"].includes(mapLevel) ? "NEIGHBORHOOD" : ["RJ_MUNICIPALITIES", "NATIONAL_MUNICIPALITIES"].includes(mapLevel) ? "MUNICIPALITY" : "REGION";
  const scope = territoryScope(selectedGeography, mapLevel);
  const query = useEpidemiologyQuery({
    ...filters,
    geography,
    ...scope,
    municipalityCode: ["MUNICIPALITY_NEIGHBORHOODS", "MUNICIPALITY_DISTRICTS"].includes(mapLevel) ? selectedGeography?.municipalityCode ?? (selectedGeography?.level === "municipality" ? selectedGeography.code : undefined) : scope.municipalityCode,
    districtCode: scope.districtCode,
    ufCode: mapLevel === "NATIONAL_MUNICIPALITIES" && selectedGeography?.level === "state" ? selectedGeography.code : mapLevel === "RJ_MUNICIPALITIES" ? "33" : undefined,
    regionCode: selectedGeography?.level === "region" ? selectedGeography.code : mapLevel === "SOUTHEAST_STATES" ? "SE" : undefined,
  });
  const selectedMunicipalityCode = selectedGeography?.level === "municipality" ? selectedGeography.code : selectedGeography?.municipalityCode;
  const districtQuery = useEpidemiologyQuery({ ...filters, geography: "DISTRICT", municipalityCode: selectedMunicipalityCode }, Boolean(selectedMunicipalityCode));
  const neighborhoodGeometryQuery = useQuery({
    queryKey: ["map", "municipality-neighborhoods-for-district-fallback", selectedMunicipalityCode],
    queryFn: () => selectedMunicipalityCode === CAMPOS_MUNICIPALITY_CODE
      ? loadMap("CAMPOS_NEIGHBORHOODS")
      : loadMap("MUNICIPALITY_NEIGHBORHOODS", selectedMunicipalityCode),
    staleTime: Infinity,
    enabled: mapLevel === "MUNICIPALITY_DISTRICTS" && Boolean(selectedMunicipalityCode),
  });
  const autoExpandedMunicipality = useRef("");
  const neighborhoodDistrictCodes = useMemo(() => [...new Set((neighborhoodGeometryQuery.data?.features ?? []).map((feature) => {
    const properties = feature.properties ?? {};
    return selectedMunicipalityCode === CAMPOS_MUNICIPALITY_CODE
      ? String(properties.parentDistrictId ?? "")
      : String(properties.parentDistrictId ?? (properties.CD_DIST != null ? "IBGE_DIST_" + String(properties.CD_DIST) : ""));
  }).filter(Boolean))], [neighborhoodGeometryQuery.data?.features, selectedMunicipalityCode]);
  useEffect(() => {
    if (!selectedMunicipalityCode) {
      autoExpandedMunicipality.current = "";
      return;
    }
    if (mapLevel !== "MUNICIPALITY_DISTRICTS" || !districtQuery.isSuccess) return;
    if (autoExpandedMunicipality.current === selectedMunicipalityCode) return;
    const districtItems = districtQuery.data.items;
    // A municipality with a single territorial subdivision should open the
    // neighborhood view directly. The API may contain several district rows
    // for the same subdivision (or use a different source code), so the
    // cartographic catalog is the source of truth for this UX decision.
    if (selectedMunicipalityCode !== CAMPOS_MUNICIPALITY_CODE && districtItems.length <= 1 && neighborhoodDistrictCodes.length === 1) {
      autoExpandedMunicipality.current = selectedMunicipalityCode;
      select({
        level: "neighborhood",
        code: "__ALL_NEIGHBORHOODS__",
        name: "Bairros disponíveis",
        municipalityCode: selectedMunicipalityCode,
        districtCode: neighborhoodDistrictCodes[0],
      });
      return;
    }
    const district = districtItems.length === 1
      ? districtItems[0]
      : districtItems.length === 0 && neighborhoodDistrictCodes.length === 1
        ? { code: neighborhoodDistrictCodes[0], name: "Distrito com bairros disponíveis", notificationsTotal: 0 }
        : undefined;
    if (!district || !canExpandToNeighborhoods(selectedMunicipalityCode, district.code)) return;
    autoExpandedMunicipality.current = selectedMunicipalityCode;
    select({
      level: "district",
      code: district.code,
      name: district.name,
      municipalityCode: selectedMunicipalityCode,
    });
  }, [districtQuery.data, districtQuery.isSuccess, mapLevel, neighborhoodDistrictCodes, select, selectedMunicipalityCode]);
  const skipDistricts = mapLevel === "MUNICIPALITY_NEIGHBORHOODS" && Boolean(
    selectedMunicipalityCode && (
      districtQuery.data?.items.length === 1 ||
      (districtQuery.data?.items.length === 0 && neighborhoodDistrictCodes.length === 1)
    ),
  );
  const goBack = () => navigation.goBack(skipDistricts);
  const items = query.isSuccess ? query.data.items : [];
  const municipal = mapLevel === "RJ_MUNICIPALITIES" || mapLevel === "NATIONAL_MUNICIPALITIES";
  const territorial = municipal || mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS" || mapLevel === "MUNICIPALITY_DISTRICTS" || mapLevel === "MUNICIPALITY_NEIGHBORHOODS";
  const covered = selectedGeography?.level === "district" || selectedGeography?.level === "neighborhood"
    ? true
    : selectedGeography?.level === "municipality" && (mapLevel === "NATIONAL_MUNICIPALITIES" || mapLevel === "MUNICIPALITY_DISTRICTS" || mapLevel === "MUNICIPALITY_NEIGHBORHOODS" || mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS" || isCoveredMunicipality(selectedGeography.code));
  const selectedItem = items.find((item) => item.code === selectedGeography?.code);
  const selectedTotal = (selectedGeography?.level === "municipality" && geography === "DISTRICT") || (selectedGeography?.level === "district" && geography === "NEIGHBORHOOD")
    ? query.data?.totalNotifications
    : selectedItem?.notificationsTotal;
  const periodDescription = filters.year === "ALL" && filters.month === "ALL" ? "no período selecionado" : filters.month === "ALL" ? "no ano selecionado" : filters.year === "ALL" ? "no mês selecionado em todos os anos" : "no mês selecionado";
  const selectionInfo = selectedGeography
    ? !covered ? "Sem registros neste recorte. Isso não equivale a zero casos."
      : query.isError ? "Não foi possível consultar os dados."
      : query.isPending ? "Carregando dados…"
      : selectedTotal !== undefined && selectedTotal !== null ? `${selectedTotal} notificações da unidade notificadora ${periodDescription}.`
      : "Sem registros neste recorte. Isso não equivale a zero casos."
    : territorial ? "Selecione um município, distrito ou bairro da notificação para consultar."
    : "Cobertura Nacional em tempo integral. Selecione uma região, estado ou município para explorar.";
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
  return { navigation, mapLevel, selectedGeography, select, navigate, goBack, skipDistricts, diseases, metadata, filters, geography, query, districtQuery, items, municipal, territorial, selectionInfo, panel };
}
