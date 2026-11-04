import type { GeographySelection, MapLevel } from "../domain/epidemiologyTypes";
const levels: MapLevel[] = [
  "BRAZIL_REGIONS",
  "SOUTHEAST_STATES",
  "NATIONAL_STATES",
  "RJ_MUNICIPALITIES",
  "NATIONAL_MUNICIPALITIES",
  "CAMPOS_DISTRICTS",
  "CAMPOS_NEIGHBORHOODS",
  "MUNICIPALITY_DISTRICTS",
  "MUNICIPALITY_NEIGHBORHOODS",
];
const labels: Record<MapLevel, string> = {
  BRAZIL_REGIONS: "Brasil",
  SOUTHEAST_STATES: "Sudeste",
  NATIONAL_STATES: "Estados do Brasil",
  RJ_MUNICIPALITIES: "Rio de Janeiro",
  NATIONAL_MUNICIPALITIES: "Municípios do estado",
  CAMPOS_DISTRICTS: "Campos dos Goytacazes",
  CAMPOS_NEIGHBORHOODS: "Distrito Sede",
  MUNICIPALITY_DISTRICTS: "Distritos do município",
  MUNICIPALITY_NEIGHBORHOODS: "Bairros da notificação",
};
export function GeographyBreadcrumb({
  level,
  navigate,
  selected,
}: {
  level: MapLevel;
  navigate: (level: MapLevel) => void;
  selected?: GeographySelection | null;
}) {
  const index = levels.indexOf(level);
  const visible = level === "NATIONAL_STATES"
    ? ["BRAZIL_REGIONS", "NATIONAL_STATES"] as MapLevel[]
    : level === "NATIONAL_MUNICIPALITIES"
      ? ["BRAZIL_REGIONS", "NATIONAL_STATES", "NATIONAL_MUNICIPALITIES"] as MapLevel[]
      : level === "MUNICIPALITY_NEIGHBORHOODS"
        ? ["BRAZIL_REGIONS", "NATIONAL_STATES", "NATIONAL_MUNICIPALITIES", "MUNICIPALITY_DISTRICTS", "MUNICIPALITY_NEIGHBORHOODS"] as MapLevel[]
        : level === "MUNICIPALITY_DISTRICTS"
          ? ["BRAZIL_REGIONS", "NATIONAL_STATES", "NATIONAL_MUNICIPALITIES", "MUNICIPALITY_DISTRICTS"] as MapLevel[]
        : level === "CAMPOS_DISTRICTS" ? ["BRAZIL_REGIONS", "SOUTHEAST_STATES", "RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS"] as MapLevel[]
          : level === "CAMPOS_NEIGHBORHOODS" ? ["BRAZIL_REGIONS", "SOUTHEAST_STATES", "RJ_MUNICIPALITIES", "CAMPOS_DISTRICTS", "CAMPOS_NEIGHBORHOODS"] as MapLevel[]
            : levels.slice(0, index + 1);
  return (
    <nav className="breadcrumb" aria-label="Navegação geográfica">
      <ol>
        {visible.map((value, i) => (
          <li key={value}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === visible.length - 1 ? (
              <span aria-current="page">{level === "CAMPOS_NEIGHBORHOODS" && i === 4 ? selected?.name ?? labels[value] : labels[value]}</span>
            ) : (
              <button onClick={() => navigate(value)}>{labels[value]}</button>
            )}
          </li>
        ))}
      </ol>
      {index > 0 && (
        <button onClick={() => navigate(visible[Math.max(0, visible.length - 2)])}>← Voltar</button>
      )}
    </nav>
  );
}
