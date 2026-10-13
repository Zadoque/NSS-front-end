import type { EpidemiologyFilters } from "../domain/epidemiologyTypes";

type Props = {
  filters: EpidemiologyFilters;
  selectionName: string;
  total: number | null | undefined;
  pending: boolean;
};

const months = [
  "jan.", "fev.", "mar.", "abr.", "mai.", "jun.",
  "jul.", "ago.", "set.", "out.", "nov.", "dez.",
];

const diseases: Record<string, string> = {
  DENG: "Dengue", CHIK: "Chikungunya", ZIKA: "Zika", FMAC: "Febre maculosa",
  TOXC: "Toxoplasmose congênita", TOXG: "Toxoplasmose gestacional",
};

function periodLabel(filters: EpidemiologyFilters) {
  if (filters.year === "ALL" && filters.month === "ALL") return "Todos os períodos";
  if (filters.year === "ALL") return `Todos os anos · ${filters.month === "ALL" ? "todos os meses" : months[filters.month - 1]}`;
  if (filters.month === "ALL") return `${filters.year} · todos os meses`;
  return `${months[filters.month - 1]} ${filters.year}`;
}

export function MobileDashboardContext({ filters, selectionName, total, pending }: Props) {
  return (
    <section className="mobile-dashboard-context" aria-label="Recorte atual" aria-live="polite">
      <div>
        <strong>{(diseases[filters.disease] ?? filters.disease) || "Doença"}</strong>
        <span>{periodLabel(filters)}</span>
      </div>
      <div className="mobile-context-location">
        <span>{selectionName}</span>
        <strong>{pending ? "…" : total === null || total === undefined ? "—" : `${total} notif.`}</strong>
      </div>
    </section>
  );
}
