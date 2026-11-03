import type { GeographySelection, MapLevel } from "../../../types/epidemiology";
const levels: MapLevel[] = [
  "BRAZIL_REGIONS",
  "SOUTHEAST_STATES",
  "NATIONAL_STATES",
  "RJ_MUNICIPALITIES",
  "CAMPOS_DISTRICTS",
  "CAMPOS_NEIGHBORHOODS",
];
const labels = ["Brasil", "Sudeste", "Rio de Janeiro", "Campos dos Goytacazes", "Bairro da notificação"];
export function GeographyBreadcrumb({
  level,
  navigate,
  selected,
}: {
  level: MapLevel;
  navigate: (level: MapLevel) => void;
  selected?: GeographySelection | null;
}) {
  const national = level === "NATIONAL_STATES" || level === "NATIONAL_MUNICIPALITIES" || level === "MUNICIPALITY_NEIGHBORHOODS";
  const trail: MapLevel[] = national
    ? ["BRAZIL_REGIONS", "NATIONAL_STATES", "NATIONAL_MUNICIPALITIES", "MUNICIPALITY_NEIGHBORHOODS"]
    : levels;
  const trailLabels = national ? ["Brasil", "Estados", "Municípios", "Bairros da notificação"] : labels;
  const index = trail.indexOf(level);
  const visible = level === "CAMPOS_DISTRICTS" ? trail.slice(0, 4) : level === "CAMPOS_NEIGHBORHOODS" ? trail.slice(0, 5) : trail.slice(0, index + 1);
  return (
    <nav className="breadcrumb" aria-label="Navegação geográfica">
      <ol>
        {visible.map((value, i) => (
          <li key={value}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === index ? (
              <span aria-current="page">{level === "CAMPOS_NEIGHBORHOODS" && i === 4 ? selected?.name ?? trailLabels[i] : trailLabels[i]}</span>
            ) : (
              <button onClick={() => navigate(value)}>{trailLabels[i]}</button>
            )}
          </li>
        ))}
      </ol>
      {index > 0 && (
        <button onClick={() => navigate(levels[index - 1])}>← Voltar</button>
      )}
    </nav>
  );
}
