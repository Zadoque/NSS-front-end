import type { GeographySelection, MapLevel } from "../../../types/epidemiology";
const levels: MapLevel[] = [
  "BRAZIL_REGIONS",
  "SOUTHEAST_STATES",
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
  const index = levels.indexOf(level);
  const visible = level === "CAMPOS_DISTRICTS" ? levels.slice(0, 4) : level === "CAMPOS_NEIGHBORHOODS" ? levels.slice(0, 5) : levels.slice(0, index + 1);
  return (
    <nav className="breadcrumb" aria-label="Navegação geográfica">
      <ol>
        {visible.map((value, i) => (
          <li key={value}>
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === index ? (
              <span aria-current="page">{level === "CAMPOS_NEIGHBORHOODS" && i === 4 ? selected?.name ?? labels[i] : labels[i]}</span>
            ) : (
              <button onClick={() => navigate(value)}>{labels[i]}</button>
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
