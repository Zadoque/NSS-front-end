export type MobileDashboardTab = "filters" | "map" | "ranking";

type Props = {
  activeTab: MobileDashboardTab;
  onChange: (tab: MobileDashboardTab) => void;
  rankingAvailable: boolean;
};

const tabs: Array<{ id: MobileDashboardTab; label: string; icon: string }> = [
  { id: "filters", label: "Filtros", icon: "☷" },
  { id: "map", label: "Mapa", icon: "⌖" },
  { id: "ranking", label: "Ranking", icon: "≡" },
];

export function MobileDashboardNav({ activeTab, onChange, rankingAvailable }: Props) {
  return (
    <nav className="mobile-dashboard-nav" aria-label="Seções do painel">
      <div role="tablist" aria-label="Visualização do painel">
        {tabs.map((tab) => {
          const disabled = tab.id === "ranking" && !rankingAvailable;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`mobile-panel-${tab.id}`}
              aria-label={disabled ? "Ranking indisponível neste nível" : tab.label}
              disabled={disabled}
              onClick={() => onChange(tab.id)}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
