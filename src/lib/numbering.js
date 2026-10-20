// Numeración de facturas (función pura, testeada en tests/numbering.test.mjs)

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
