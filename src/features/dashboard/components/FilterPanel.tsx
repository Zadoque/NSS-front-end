import { useId } from "react";
import type { EpidemiologyFilters } from "../../../types/epidemiology";
import { MapLegend } from "./MapLegend";
export type FilterPanelProps = {
  filters: EpidemiologyFilters;
  onChange: (filters: EpidemiologyFilters) => void;
  diseases: string[];
  diseasesLoading: boolean;
  diseasesError: boolean;
  retryDiseases: () => void;
  selectionName: string;
  selectionInfo: string;
  demo: boolean;
  municipal: boolean;
  availableYears: number[];
  availableMonths: number[];
};
const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
export function FilterPanel({
  municipal,
  filters,
  onChange,
  diseases,
  diseasesLoading,
  diseasesError,
  retryDiseases,
  selectionName,
  selectionInfo,
  demo,
  availableYears,
  availableMonths,
}: FilterPanelProps) {
  const id = useId();
  return (
    <div className="panel-content">
      <div className="section-label">RECORTE EPIDEMIOLÓGICO</div>
      <h2>Filtros e informações</h2>
      {diseasesError && (
        <p role="alert">
          Falha ao listar doenças.{" "}
          <button onClick={retryDiseases}>Tentar novamente</button>
        </p>
      )}
      {!diseasesLoading && !diseasesError && diseases.length === 0 && (
        <p role="status">Nenhuma doença disponível.</p>
      )}
      <label htmlFor={`${id}-disease`}>Doença</label>
      <select
        id={`${id}-disease`}
        value={filters.disease}
        disabled={diseasesLoading || diseasesError || !diseases.length}
        onChange={(e) => onChange({ ...filters, disease: e.target.value })}
      >
        {!diseases.length && (
          <option value="">
            {diseasesLoading ? "Carregando…" : "Indisponível"}
          </option>
        )}
        {diseases.map((d) => (
          <option key={d} value={d}>
            {d === "DENG" ? "Dengue · DENG" : d}
          </option>
        ))}
      </select>
      <div className="filter-period">
        <div>
          <label htmlFor={`${id}-year`}>Ano</label>
          <select
            id={`${id}-year`}
            value={filters.year}
            onChange={(e) =>
              onChange({
                ...filters,
                year: e.target.value === "ALL" ? "ALL" : Number(e.target.value),
              })
            }
          >
            <option value="ALL">Todos os anos</option>
            {availableYears.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-month`}>Mês</label>
          <select
            id={`${id}-month`}
            value={filters.month}
            onChange={(e) =>
              onChange({
                ...filters,
                month: e.target.value === "ALL" ? "ALL" : Number(e.target.value),
              })
            }
          >
            <option value="ALL">Todos os meses · total do ano</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {months[month - 1]}
              </option>
            ))}
            {!availableMonths.length && months.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="filter-period">
        <div>
          <label htmlFor={`${id}-sex`}>Sexo</label>
          <select id={`${id}-sex`} value={filters.sex ?? "ALL"} onChange={(e) => onChange({ ...filters, ...(e.target.value === "ALL" ? { sex: undefined } : { sex: e.target.value as "M" | "F" }) })}>
            <option value="ALL">Todos (M + F + I)</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-age`}>Faixa etária</label>
          <select id={`${id}-age`} value={filters.ageBand ?? "ALL"} onChange={(e) => onChange({ ...filters, ...(e.target.value === "ALL" ? { ageBand: undefined } : { ageBand: e.target.value as EpidemiologyFilters["ageBand"] }) })}>
            <option value="ALL">Todas</option>
            <option value="LT1">&lt;1</option><option value="01_04">1–4</option><option value="05_09">5–9</option><option value="10_14">10–14</option><option value="15_19">15–19</option><option value="20_39">20–39</option><option value="40_59">40–59</option><option value="60_64">60–64</option><option value="65_69">65–69</option><option value="70_74">70–74</option><option value="75_79">75–79</option><option value="80_PLUS">80+</option>
          </select>
        </div>
      </div>
      <section className="selection" aria-live="polite">
        <div className="section-label">LOCALIZAÇÃO SELECIONADA</div>
        <h3>{selectionName}</h3>
        <p>{selectionInfo}</p>
      </section>
      <MapLegend municipal={municipal} />
      {demo && (
        <p className="demo-note">
          <strong>DEMO</strong> Dados sintéticos para demonstração. Não são
          estatísticas reais.
        </p>
      )}
    </div>
  );
}
