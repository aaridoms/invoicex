// Numeración de facturas (función pura, testeada en tests/numbering.test.mjs)

// Prefijo de la serie con el año sustituido: "{AAAA}-" -> "2026-", "F{AA}/" -> "F26/"
export const expandPrefix = (prefix, year) =>
  String(prefix ?? "")
    .replaceAll("{AAAA}", String(year))
    .replaceAll("{AA}", String(year).slice(-2));

// Siguiente número de la serie: el mayor ya usado con ese prefijo + 1.
// Los números que no siguen el formato (escritos a mano) se ignoran.
export function nextSeriesNumber(prefix, digits, year, existing = []) {
  const p = expandPrefix(prefix, year);
  let max = 0;
  for (const n of existing) {
    if (typeof n !== "string" || !n.startsWith(p)) continue;
    const rest = n.slice(p.length);
    if (/^\d+$/.test(rest)) max = Math.max(max, Number(rest));
  }
  return `${p}${String(max + 1).padStart(digits, "0")}`;
}

// Escapa los comodines de LIKE (%, _ y \) para buscar un prefijo literal
export const likePrefix = (prefix) => `${prefix.replace(/[\\%_]/g, "\\$&")}%`;

// Candidatos al siguiente número a partir del último usado, conservando
// prefijo y ceros a la izquierda: "2026-0009" -> "2026-0010", "2026-0011"…
export function nextNumberCandidates(lastNumber, year, count = 20) {
  if (!lastNumber) {
    return Array.from({ length: count }, (_, i) =>
      `${year}-${String(i + 1).padStart(4, "0")}`
    );
  }
  const match = String(lastNumber).match(/^(.*?)(\d+)$/);
  if (!match) {
    return Array.from({ length: count }, (_, i) => `${lastNumber}-${i + 1}`);
  }
  const [, prefix, digits] = match;
  return Array.from(
    { length: count },
    (_, i) =>
      `${prefix}${String(Number(digits) + i + 1).padStart(digits.length, "0")}`
  );
}
