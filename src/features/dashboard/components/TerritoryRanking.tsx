import type { EpidemiologyItem, GeographySelection } from "../../../types/epidemiology";

export function TerritoryRanking({ level, items, onSelect, selected }: { level: "district" | "neighborhood"; items: EpidemiologyItem[]; onSelect: (value: GeographySelection) => void; selected: GeographySelection | null }) {
  const rows = [...items].sort((a, b) => b.notificationsTotal - a.notificationsTotal);
  return (
    <section className="ranking card" aria-label={level === "district" ? "Notificações por distrito" : "Notificações por bairro da notificação"}>
      <div className="section-label">TERRITÓRIO DA UNIDADE NOTIFICADORA</div>
      <h2>{level === "district" ? "Notificações por distrito" : "Notificações por bairro da notificação"}</h2>
      <p>O território é derivado da unidade notificadora no CNES. Não representa automaticamente residência ou local de infecção.</p>
      <ol>
        {rows.map((item, index) => (
          <li key={item.code}>
            <button aria-pressed={selected?.code === item.code} onClick={() => onSelect({ level, code: item.code, name: item.name, municipalityCode: "3301009", ...(level === "neighborhood" ? { districtCode: item.parentDistrictId } : {}) })}>
              <span className="rank-number">{index + 1}</span><span>{item.name}</span><strong>{item.notificationsTotal} notificações</strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
