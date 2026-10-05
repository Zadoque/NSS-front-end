import { municipalities } from "../../../data/coverage";
import type {
  GeographySelection,
  EpidemiologyItem,
} from "../../../types/epidemiology";
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
  const rows = municipalities
    .map((m) => ({ ...m, notificationsTotal: byCode.get(m.cdMun)?.notificationsTotal }))
    .sort((a, b) => (b.notificationsTotal ?? -1) - (a.notificationsTotal ?? -1));
  return (
    <section className="ranking card">
      <div className="section-label">COBERTURA PARCIAL · 4 MUNICÍPIOS</div>
      <h2>Casos por município</h2>
      <p>Ranking do recorte selecionado. Não representa o total do estado.</p>
      <ol>
        {rows.map((item, i) => (
          <li key={item.cdMun}>
            <button
              aria-pressed={selected?.code === item.cdMun}
              onClick={() =>
                onSelect({
                  level: "municipality",
                  code: item.cdMun,
                  name: item.nmMun,
                })
              }
            >
              <span className="rank-number">{i + 1}</span>
              <span>{item.nmMun}</span>
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
