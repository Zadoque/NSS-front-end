const saoPauloDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

/** Identifies the daily cache window beginning at 02:00 in São Paulo. */
export function operationalDay(now = new Date()): string {
  const parts = Object.fromEntries(saoPauloDate.formatToParts(now).map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  if (Number(parts.hour) < 2) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
