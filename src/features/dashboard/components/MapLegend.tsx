export function caseColor(cases: number, visibleMaximum = 100) {
  if (cases <= 0) return "#e0f2ee";
  const maximum = Math.max(1, visibleMaximum);
  // Logarithmic normalization preserves contrast when a national ranking
  // contains both small and very large territories.
  const ratio = Math.min(1, Math.log1p(cases) / Math.log1p(maximum));
  const lightness = 92 - ratio * 60;
  const saturation = 42 + ratio * 38;
  return `hsl(164 ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}
export function MapLegend({ municipal }: { municipal: boolean }) {
  const entries = municipal
    ? [
        ["#dce2e6", "Sem notificações mapeadas"],
        ["#f6f0d8", "Coberto · sem valor disponível"],
        [caseColor(0), "0 notificações"],
        [caseColor(18), "1–40 notificações"],
        [caseColor(85), "41–100 notificações"],
        [caseColor(120), "Mais de 100 notificações"],
      ]
    : [
        ["#b8d9d2", "Disponível para explorar"],
        ["#f6f0d8", "Sem notificações no período"],
      ];
  return (
    <section className="legend" aria-label="Legenda">
      <h3>{municipal ? "Notificações no período" : "Navegação geográfica"}</h3>
      <ul>
        {entries.map(([color, label]) => (
          <li key={label}>
            <span style={{ background: color }} />
            {label}
          </li>
        ))}
      </ul>
      <p>Contagens absolutas de notificações; não representam incidência nem casos confirmados.</p>
    </section>
  );
}
