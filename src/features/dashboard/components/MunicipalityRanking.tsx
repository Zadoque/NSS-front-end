import type {
  GeographySelection,
  EpidemiologyItem,
} from "../domain/epidemiologyTypes";
export function MunicipalityRanking({
  items,
  onSelect,
  selected,
}: {
  items: EpidemiologyItem[];
  onSelect: (selection: GeographySelection) => void;
  selected: GeographySelection | null;
}) {
  const byCode = new Map(items.map((item) => [item.code, item]));
  const rows = items
    .map((m) => ({ ...m, notificationsTotal: byCode.get(m.code)?.notificationsTotal }))
    .sort((a, b) => (b.notificationsTotal ?? -1) - (a.notificationsTotal ?? -1));
  return (
    <section className="ranking card">
      <div className="section-label">COBERTURA NACIONAL · {rows.length} MUNICÍPIOS</div>
      <h2>Casos por município</h2>
      <p>Ranking do recorte selecionado. Não representa o total do estado.</p>
      <ol>
        {rows.map((item, i) => (
          <li key={item.code}>
            <button
              aria-pressed={selected?.code === item.code}
              onClick={() =>
                onSelect({
                  level: "municipality",
                  code: item.code,
                  name: item.name,
                })
              }
            >
              <span className="rank-number">{i + 1}</span>
              <span>{item.name}</span>
              <strong>
                {item.notificationsTotal === undefined
                  ? "Sem registros"
                  : `${item.notificationsTotal} notificações`}
              </strong>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
