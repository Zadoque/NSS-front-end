import { useState } from "react";
import { isDemo, isProdMock } from "../../data/dataSource";
import { demoCoverage } from "../../data/coverage";
import { mapViews } from "../../data/maps";
import type { EpidemiologyFilters } from "../../types/epidemiology";
import {
  useDiseases,
  useMetadata,
  useEpidemiologyQuery,
} from "./hooks/useEpidemiologyQuery";
import { useMapNavigation } from "./hooks/useMapNavigation";
import { GeographicMap } from "./components/GeographicMap";
import { GeographyBreadcrumb } from "./components/GeographyBreadcrumb";
import { GeographySelector } from "./components/GeographySelector";
import { FilterPanel } from "./components/FilterPanel";
import { FilterDrawer } from "./components/FilterDrawer";
import { MunicipalityRanking } from "./components/MunicipalityRanking";
import { TerritoryRanking } from "./components/TerritoryRanking";
export function DashboardPage({ onLogout, onAdmin }: { onLogout: () => void; onAdmin?: () => void }) {
  const navigation = useMapNavigation();
  const { mapLevel, selectedGeography, select, navigate, goBack } = navigation;
  const diseases = useDiseases();
  const metadata = useMetadata();
  const [filterInput, setFilters] = useState<EpidemiologyFilters>({
    disease: "DENG",
    year: 2026,
    month: 1,
  });
  const filters = {
    ...filterInput,
    disease: diseases.data?.includes(filterInput.disease)
      ? filterInput.disease
      : (diseases.data?.[0] ?? ""),
  };
  const geography = mapLevel === "CAMPOS_DISTRICTS"
    ? "DISTRICT"
    : mapLevel === "CAMPOS_NEIGHBORHOODS"
      ? "NEIGHBORHOOD"
      : mapLevel === "RJ_MUNICIPALITIES"
        ? "MUNICIPALITY"
        : "REGION";
  const query = useEpidemiologyQuery({
    ...filters,
    geography,
    // A seleção no mapa municipal é apenas visual: o ranking deve continuar
    // trazendo todos os municípios do RJ. O escopo Campos é necessário apenas
    // para as consultas de distrito e bairro.
    municipalityCode:
      mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS"
        ? "3301009"
        : undefined,
    districtCode:
      mapLevel === "CAMPOS_NEIGHBORHOODS"
        ? selectedGeography?.districtCode ??
          (selectedGeography?.level === "district"
            ? selectedGeography.code
            : undefined)
        : undefined,
  });
  const items = query.isSuccess ? query.data.items : [];
  const municipal = mapLevel === "RJ_MUNICIPALITIES";
  const territorial = municipal || mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS";
  const covered =
    selectedGeography?.level === "district" || selectedGeography?.level === "neighborhood"
      ? true
      : selectedGeography?.level === "municipality" &&
        demoCoverage.caseDataAvailableForMunicipalities.includes(selectedGeography.code);
  const selectedItem = items.find(
    (item) => item.code === selectedGeography?.code,
  );
  const selectedTotal =
    (selectedGeography?.level === "municipality" && geography === "DISTRICT") ||
    (selectedGeography?.level === "district" && geography === "NEIGHBORHOOD")
      ? query.data?.totalNotifications
      : selectedItem?.notificationsTotal;
  const periodDescription =
    filters.year === "ALL" && filters.month === "ALL"
      ? "no período selecionado"
      : filters.month === "ALL"
        ? "no ano selecionado"
        : filters.year === "ALL"
          ? "no mês selecionado em todos os anos"
          : "no mês selecionado";
  const selectionInfo = selectedGeography
    ? selectedGeography.level === "district" && selectedGeography.code !== "CG_DIST_SEDE"
      ? "Detalhamento por bairro da notificação indisponível neste distrito. O total distrital permanece disponível."
      : !covered
      ? "Sem cobertura nesta V1. Dados ainda não disponíveis."
      : query.isError
        ? "Não foi possível consultar os dados."
          : query.isPending
          ? "Carregando dados…"
          : selectedTotal !== undefined && selectedTotal !== null
            ? `${selectedTotal} notificações da unidade notificadora ${periodDescription}.`
            : "Sem registros neste recorte. Isso não equivale a zero casos."
    : territorial
      ? "Selecione um município, distrito ou bairro da notificação para consultar."
      : "Explore o Sudeste e o Rio de Janeiro. Cobertura parcial, sem total agregado.";
  const panel = {
    municipal,
    filters,
    onChange: setFilters,
    diseases: diseases.data ?? [],
    diseasesLoading: diseases.isPending,
    diseasesError: diseases.isError,
    retryDiseases: () => {
      void diseases.refetch();
    },
    selectionName: selectedGeography?.name ?? mapViews[mapLevel].title,
    selectionInfo,
    demo: isDemo,
    availableYears: metadata.data?.availableYears ?? [],
    availableMonths:
      filters.year === "ALL"
        ? Array.from({ length: 12 }, (_, index) => index + 1)
        : metadata.data?.availableMonthsByYear[String(filters.year)] ?? [],
  };
  return (
    <>
      <header className="header">
        <div className="brand-mark" aria-hidden="true">
          NSS
        </div>
        <div>
          <strong>Núcleo de Situação de Saúde</strong>
          <p>UENF · Vigilância epidemiológica</p>
        </div>
        {isDemo && <span className="badge">{isProdMock ? 'SNAPSHOT REAL' : 'DEMO'}</span>}
        {onAdmin && <button className="header-action" type="button" onClick={onAdmin}>Usuários</button>}
        <button className="header-action" type="button" onClick={onLogout}>Sair</button>
      </header>
      <main>
        <a className="back-home" href="/">← Página inicial</a>
        <div className="page-intro">
          <div className="section-label">TERRITÓRIO E SAÚDE</div>
          <h1>Um olhar sobre o território</h1>
          <p>
            Explore o mapa e consulte as notificações por período nos municípios cobertos.
          </p>
        </div>
        <GeographyBreadcrumb level={mapLevel} navigate={navigate} selected={selectedGeography} />
        <GeographySelector key={mapLevel} navigation={navigation} />
        <div className={`dashboard-grid${territorial && query.isSuccess ? " has-ranking" : ""}`}>
          <section className="card map-card" aria-label="Exploração geográfica">
            <div className="map-heading">
              <div>
                {mapLevel !== "BRAZIL_REGIONS" && (
                  <button
                    className="map-back"
                    type="button"
                    onClick={goBack}
                    aria-label={`Voltar para ${mapLevel === "CAMPOS_NEIGHBORHOODS" ? "distritos" : mapLevel === "CAMPOS_DISTRICTS" ? "municípios" : mapLevel === "RJ_MUNICIPALITIES" ? "estados" : "regiões"}`}
                  >
                    ← Voltar
                  </button>
                )}
                <div className="section-label">
                  {mapLevel === "CAMPOS_NEIGHBORHOODS"
                    ? "BAIRROS DA NOTIFICAÇÃO"
                    : mapLevel === "CAMPOS_DISTRICTS"
                      ? "DISTRITOS DA NOTIFICAÇÃO"
                      : municipal
                        ? "MUNICÍPIOS"
                    : mapLevel === "BRAZIL_REGIONS"
                      ? "REGIÕES"
                      : "ESTADOS"}
                </div>
                <h2>{mapViews[mapLevel].title}</h2>
              </div>
              <span className="map-step">
                {municipal ? "03" : mapLevel === "BRAZIL_REGIONS" ? "01" : "02"}{" "}
                / 03
              </span>
            </div>
            <GeographicMap
              key={mapLevel}
              level={mapLevel}
              selected={selectedGeography}
              items={items}
              dataStatus={
                query.isError
                  ? "error"
                  : query.isSuccess
                    ? "success"
                    : "loading"
              }
              onSelect={select}
              onBack={mapLevel !== "BRAZIL_REGIONS" ? goBack : undefined}
            />
            <div className="map-context" aria-live="polite">
              <strong>
                {selectedGeography?.name ??
                  (municipal
                    ? "Cobertura municipal parcial"
                    : "Navegação pelo território")}
              </strong>
              <p>{selectionInfo}</p>
              {query.isSuccess && query.data.coverage.status === "PARTIAL" && (
                <p role="status">Cobertura territorial parcial: {query.data.coverage.unmappedNotificationsTotal} notificações da unidade notificadora sem distrito/bairro oficial mapeado. Elas permanecem no total municipal.</p>
              )}
            </div>
          </section>
          <aside className="card desktop-panel">
            <FilterPanel {...panel} />
          </aside>
          {municipal && query.isSuccess && <MunicipalityRanking items={items} onSelect={select} selected={selectedGeography} />}
          {(mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS") && query.isSuccess && (
            <TerritoryRanking level={mapLevel === "CAMPOS_DISTRICTS" ? "district" : "neighborhood"} items={items} onSelect={select} selected={selectedGeography} />
          )}
        </div>
        <FilterDrawer panel={panel} />
        {territorial && (
          <div className="query-state" aria-live="polite">
            {query.isPending && (
              <p role="status">
                {filters.disease
                  ? "Carregando dados epidemiológicos…"
                  : "Selecione uma doença disponível para consultar."}
              </p>
            )}
            {query.isError && (
              <p role="alert">
                Não foi possível carregar os dados.{" "}
                <button onClick={() => void query.refetch()}>
                  Tentar novamente
                </button>
              </p>
            )}
            {query.isSuccess && !items.length && (
              <p>Sem registros para este recorte nos municípios cobertos.</p>
            )}
            {query.isSuccess && (
              <p>
                Total oficial do recorte: {query.data.totalNotifications === null ? "indisponível" : query.data.totalNotifications} notificações.
                {query.data.coverage.status === "PARTIAL" && ` Mapeadas no território: ${query.data.coverage.mappedNotificationsTotal}; não mapeadas: ${query.data.coverage.unmappedNotificationsTotal}.`}
              </p>
            )}
          </div>
        )}
        <footer>
          NSS / UENF{" "}
          <span>
            {isProdMock ? `Dados reais agregados · Snapshot publicado em ${(metadata.data as { sourcePublishedAt?: string } | undefined)?.sourcePublishedAt?.slice(0, 10) ?? 'carregamento'} · Sem atualização em tempo real · Território da unidade notificadora, não residência` : isDemo
              ? "Demonstração com dados sintéticos · V1"
              : "Dados fornecidos pela API epidemiológica · V1"}
          </span>
        </footer>
      </main>
    </>
  );
}
