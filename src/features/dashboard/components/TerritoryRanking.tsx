import type { EpidemiologyItem, GeographySelection } from "../domain/epidemiologyTypes";

export function TerritoryRanking({ level, items, onSelect, selected }: { level: "region" | "state" | "district" | "neighborhood"; items: EpidemiologyItem[]; onSelect: (value: GeographySelection) => void; selected: GeographySelection | null }) {
  const rows = [...items].sort((a, b) => b.notificationsTotal - a.notificationsTotal);
  const isArea = level === "region" || level === "state";
  const title = level === "region" ? "Notificações por região" : level === "state" ? "Notificações por estado" : level === "district" ? "Notificações por distrito" : "Notificações por bairro da notificação";
  const label = level === "region" ? `COBERTURA NACIONAL · ${rows.length} REGIÕES` : level === "state" ? `COBERTURA NACIONAL · ${rows.length} ESTADOS` : "TERRITÓRIO DA UNIDADE NOTIFICADORA";
  return (
    <section className="ranking card" aria-label={title}>
      <div className="section-label">{label}</div>
      <h2>{title}</h2>
      <p>{isArea ? "Ranking do recorte selecionado." : "O território é derivado da unidade notificadora no CNES. Não representa automaticamente residência ou local de infecção."}</p>
      <ol>
        {rows.map((item, index) => (
          <li key={item.code}>
            <button aria-pressed={selected?.code === item.code} onClick={() => onSelect({ level, code: item.code, name: item.name, municipalityCode: level === "district" && selected?.level === "municipality" ? selected.code : selected?.municipalityCode, ...(level === "neighborhood" ? { districtCode: item.parentDistrictId } : {}) })}>
              <span className="rank-number">{index + 1}</span><span>{item.name}</span><strong>{item.notificationsTotal} notificações</strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
