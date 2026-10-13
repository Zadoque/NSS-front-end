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
    <nav className="dashboard-view-switcher" aria-label="Tipo de visualização">
      <span className="section-label">VISUALIZAÇÃO</span>
      <div className="dashboard-view-tabs">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            aria-pressed={activeView === view.id}
            aria-controls={`dashboard-view-${view.id}`}
            onClick={() => onChange(view.id)}
          >
            {view.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
