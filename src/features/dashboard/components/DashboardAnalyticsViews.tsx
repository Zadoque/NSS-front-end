import type { EpidemiologyItem, GeographySelection } from "../domain/epidemiologyTypes";
import type { ReactNode } from "react";
import type { DashboardView } from "./DashboardViewSwitcher";

type Coverage = {
  mappedNotificationsTotal: number;
  unmappedNotificationsTotal: number;
};

type Props = {
  items: EpidemiologyItem[];
  totalNotifications: number | null | undefined;
  coverage?: Coverage;
  onSelect: (selection: GeographySelection) => void;
  selected: GeographySelection | null;
  activeView: Exclude<DashboardView, "map">;
  status: "loading" | "error" | "success";
};

function percentage(value: number, total: number | null | undefined) {
  return total && total > 0 ? (value / total) * 100 : 0;
}

function AnalyticsShell({ title, description, children, id }: { title: string; description: string; children: ReactNode; id: string }) {
  return (
    <section id={id} className="dashboard-analytics-view" role="tabpanel" aria-labelledby="dashboard-view-switcher">
      <div className="page-intro">
        <div className="section-label">ANÁLISE DO RECORTE</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

export function DashboardAnalyticsViews({ items, totalNotifications, coverage, onSelect, selected, activeView, status }: Props) {
  if (status !== "success" || items.length === 0) {
    const title = activeView === "indicators" ? "Indicadores do recorte" : activeView === "ranking" ? "Ranking territorial" : activeView === "coverage" ? "Cobertura territorial" : "Tabela analítica";
    return <AnalyticsShell id={`dashboard-view-${activeView}-panel`} title={title} description="Resumo dos dados retornados para a doença, período e território selecionados."><div className="card analytics-empty-state" role={status === "error" ? "alert" : "status"}>{status === "loading" ? "Carregando dados para esta visualização…" : status === "error" ? <>Não foi possível carregar os dados. <button type="button" onClick={() => window.location.reload()}>Tentar novamente</button></> : <>Para a seleção atual: <strong>não há dados para esta visualização.</strong><span>Tente alterar o território, a doença ou o período.</span></>}</div></AnalyticsShell>;
  }
  const sorted = [...items].sort((a, b) => b.notificationsTotal - a.notificationsTotal);
  const total = totalNotifications ?? sorted.reduce((sum, item) => sum + item.notificationsTotal, 0);
  const highest = sorted[0];
  const mapped = coverage?.mappedNotificationsTotal ?? 0;
  const unmapped = coverage?.unmappedNotificationsTotal ?? 0;
  const coverageTotal = mapped + unmapped;
  const coveragePercent = coverageTotal > 0 ? (mapped / coverageTotal) * 100 : null;
  const selectItem = (item: EpidemiologyItem) => onSelect({ level: "municipality", code: item.code, name: item.name });

  return (
    <div className="dashboard-analytics-views">
      <div id="dashboard-view-indicators" hidden={activeView !== "indicators"}>
        <AnalyticsShell id="dashboard-view-indicators-panel" title="Indicadores do recorte" description="Resumo dos dados retornados para a doença, período e território selecionados.">
          <div className="indicator-grid">
            <article className="card indicator-card"><span>Total de notificações</span><strong>{totalNotifications ?? "Indisponível"}</strong></article>
            <article className="card indicator-card"><span>Territórios retornados</span><strong>{items.length}</strong></article>
            <article className="card indicator-card"><span>Maior território</span><strong>{highest?.name ?? "Indisponível"}</strong><small>{highest ? `${highest.notificationsTotal} notificações` : ""}</small></article>
            <article className="card indicator-card"><span>Cobertura mapeada</span><strong>{coveragePercent === null ? "Indisponível" : `${coveragePercent.toFixed(1)}%`}</strong></article>
          </div>
        </AnalyticsShell>
      </div>
      <div id="dashboard-view-ranking" hidden={activeView !== "ranking"}>
        <AnalyticsShell id="dashboard-view-ranking-panel" title="Ranking territorial" description="Comparação dos territórios com registros no recorte selecionado.">
          <div className="analytics-bars card">
            {sorted.length === 0 && <p className="query-state">Sem registros para este recorte.</p>}
            {sorted.map((item) => {
              const width = total > 0 ? Math.max(2, (item.notificationsTotal / total) * 100) : 0;
              return <button className={selected?.code === item.code ? "analytics-bar selected" : "analytics-bar"} key={item.code} type="button" onClick={() => selectItem(item)} aria-label={`${item.name}: ${item.notificationsTotal} notificações`}>
                <span className="analytics-bar-label">{item.name}</span><span className="analytics-bar-track"><span style={{ width: `${width}%` }} /></span><strong>{item.notificationsTotal}</strong>
              </button>;
            })}
          </div>
        </AnalyticsShell>
      </div>
      <div id="dashboard-view-coverage" hidden={activeView !== "coverage"}>
        <AnalyticsShell id="dashboard-view-coverage-panel" title="Cobertura territorial" description="Distribuição entre notificações mapeadas e notificações sem distrito ou bairro oficial associado.">
          <div className="card coverage-card">
            {coveragePercent === null ? <p>Dados de cobertura indisponíveis para este recorte.</p> : <><div className="coverage-track"><span style={{ width: `${coveragePercent}%` }} /></div><div className="coverage-values"><strong>{mapped} mapeadas ({coveragePercent.toFixed(1)}%)</strong><strong>{unmapped} não mapeadas ({(100 - coveragePercent).toFixed(1)}%)</strong></div><p>Notificações não mapeadas permanecem no total municipal e não significam ausência de casos.</p></>}
          </div>
        </AnalyticsShell>
      </div>
      <div id="dashboard-view-table" hidden={activeView !== "table"}>
        <AnalyticsShell id="dashboard-view-table-panel" title="Tabela analítica" description="Valores absolutos e participação de cada território no total do recorte.">
          <div className="card analytical-table-wrap"><table className="analytical-table"><caption className="sr-only">Notificações por território</caption><thead><tr><th scope="col">Território</th><th scope="col">Notificações</th><th scope="col">Participação</th></tr></thead><tbody>{sorted.map((item) => <tr key={item.code}><th scope="row">{item.name}</th><td>{item.notificationsTotal}</td><td>{percentage(item.notificationsTotal, total).toFixed(1)}%</td></tr>)}</tbody></table></div>
        </AnalyticsShell>
      </div>
    </div>
  );
}
