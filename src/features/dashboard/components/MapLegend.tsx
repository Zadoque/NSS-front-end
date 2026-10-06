export function caseColor(cases: number) {
  return cases === 0
    ? "#e0f2ee"
    : cases <= 40
      ? "#8ccbb8"
      : cases <= 100
        ? "#328b77"
        : "#125345";
}
export function MapLegend({ municipal }: { municipal: boolean }) {
  const entries = municipal
    ? [
        ["#dce2e6", "Sem cobertura nesta V1"],
        ["#f6f0d8", "Coberto · sem valor disponível"],
        [caseColor(0), "0 notificações"],
        [caseColor(18), "1–40 notificações"],
        [caseColor(85), "41–100 notificações"],
        [caseColor(120), "Mais de 100 notificações"],
      ]
    : [
        ["#b8d9d2", "Disponível para explorar"],
        ["#dce2e6", "Sem cobertura nesta V1"],
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
      <p>
        {municipal
          ? "Contagens absolutas de notificações; não representam incidência nem casos confirmados."
          : "As cores indicam navegação, sem totais epidemiológicos."}
      </p>
    </section>
  );
}
