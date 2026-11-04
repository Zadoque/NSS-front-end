export type DashboardView = "map" | "indicators" | "ranking" | "coverage" | "table";

type Props = {
  activeView: DashboardView;
  onChange: (view: DashboardView) => void;
};

const views: Array<{ id: DashboardView; label: string }> = [
  { id: "map", label: "Mapa" },
  { id: "indicators", label: "Indicadores" },
  { id: "ranking", label: "Ranking" },
  { id: "coverage", label: "Cobertura" },
  { id: "table", label: "Tabela" },
];

export function DashboardViewSwitcher({ activeView, onChange }: Props) {
  return (
    <nav id="dashboard-view-switcher" className="dashboard-view-switcher" aria-label="Tipo de visualização">
      <span className="section-label">VISUALIZAÇÃO</span>
      <div id="dashboard-view-tablist" className="dashboard-view-tabs" role="tablist" aria-label="Visualizações do dashboard">
        {views.map((view) => (
          <button
            key={view.id}
            id={`dashboard-tab-${view.id}`}
            type="button"
            role="tab"
            aria-label={`Visualização: ${view.label}`}
            aria-selected={activeView === view.id}
            aria-controls={`dashboard-panel-${view.id}`}
            tabIndex={activeView === view.id ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
              event.preventDefault();
              const current = views.findIndex((item) => item.id === view.id);
              const next = event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + views.length) % views.length;
              onChange(views[next].id);
              requestAnimationFrame(() => document.getElementById(`dashboard-tab-${views[next].id}`)?.focus({ preventScroll: true }));
            }}
            onClick={() => onChange(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
