import { useLayoutEffect, useRef, useState } from "react";
import { isDemo, isProdMock } from "./api/sources/dataSource";
import { mapViews } from "./geography/maps";
import { useDashboardModel } from "./hooks/useDashboardModel";
import { GeographicMap } from "./components/GeographicMap";
import { GeographyBreadcrumb } from "./components/GeographyBreadcrumb";
import { GeographySelector } from "./components/GeographySelector";
import { FilterPanel } from "./components/FilterPanel";
import { MunicipalityRanking } from "./components/MunicipalityRanking";
import { TerritoryRanking } from "./components/TerritoryRanking";
import { MobileDashboardContext } from "./components/MobileDashboardContext";
import { MobileDashboardNav, type MobileDashboardTab } from "./components/MobileDashboardNav";
import { DashboardViewSwitcher, type DashboardView } from "./components/DashboardViewSwitcher";
import { DashboardAnalyticsViews } from "./components/DashboardAnalyticsViews";
export function DashboardPage({ onLogout, onAdmin }: { onLogout: () => void; onAdmin?: () => void }) {
  const { navigation, mapLevel, selectedGeography, select, navigate, goBack, metadata, filters, query, items, municipal, territorial, selectionInfo, panel } = useDashboardModel();
  const [mobileTab, setMobileTab] = useState<MobileDashboardTab>("map");
  const [activeView, setActiveView] = useState<DashboardView>("map");
  const viewScrollY = useRef<Record<DashboardView, number>>({
    map: 0,
    indicators: 0,
    ranking: 0,
    coverage: 0,
    table: 0,
  });
  const previousView = useRef<DashboardView>("map");
  const rankingAvailable = municipal || mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS";
  const selectedTotal = query.data?.totalNotifications;
  useLayoutEffect(() => {
    if (activeView === "map" && previousView.current !== "map") {
      window.requestAnimationFrame(() => window.scrollTo(0, viewScrollY.current.map));
    } else if (previousView.current !== activeView) {
      window.requestAnimationFrame(() => window.scrollTo(0, viewScrollY.current[activeView]));
    }
    previousView.current = activeView;
  }, [activeView]);
  const changeView = (view: DashboardView) => {
    if (view !== activeView) viewScrollY.current[activeView] = window.scrollY;
    setActiveView(view);
    if (view === "map") setMobileTab("map");
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
        <div className="dashboard-territory-selection">
          <MobileDashboardContext filters={filters} selectionName={selectedGeography?.name ?? mapViews[mapLevel].title} total={selectedTotal} pending={query.isPending} />
          <div className="dashboard-map-navigation">
            <GeographyBreadcrumb level={mapLevel} navigate={navigate} selected={selectedGeography} />
            <GeographySelector key={mapLevel} navigation={navigation} />
          </div>
        </div>
        <DashboardViewSwitcher activeView={activeView} onChange={changeView} />
        {activeView === "map" ? <div className={`dashboard-workspace mobile-tab-${mobileTab}`}>
          <div id="mobile-panel-map" className={`dashboard-grid${territorial && query.isSuccess ? " has-ranking" : ""}`}>
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
          <div className="mobile-dashboard-panels">
          <section id="mobile-panel-filters" className="mobile-dashboard-panel card" role="tabpanel" aria-label="Filtros" hidden={mobileTab !== "filters"}>
            <FilterPanel {...panel} />
          </section>
          <section id="mobile-panel-ranking" className="mobile-dashboard-panel mobile-ranking-panel" role="tabpanel" aria-label="Ranking" hidden={mobileTab !== "ranking"}>
            {query.isSuccess && municipal && <MunicipalityRanking items={items} onSelect={select} selected={selectedGeography} />}
            {query.isSuccess && (mapLevel === "CAMPOS_DISTRICTS" || mapLevel === "CAMPOS_NEIGHBORHOODS") && (
              <TerritoryRanking level={mapLevel === "CAMPOS_DISTRICTS" ? "district" : "neighborhood"} items={items} onSelect={select} selected={selectedGeography} />
            )}
            {!query.isSuccess && <p role="status">Carregando o ranking do recorte selecionado…</p>}
          </section>
          </div>
          <MobileDashboardNav activeTab={mobileTab} onChange={setMobileTab} rankingAvailable={rankingAvailable} />
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
        </div> : <DashboardAnalyticsViews activeView={activeView} status={query.isPending ? "loading" : query.isError ? "error" : "success"} items={items} totalNotifications={query.data?.totalNotifications} coverage={query.data?.coverage} onSelect={select} selected={selectedGeography} />}
      </main>
    </>
  );
}
