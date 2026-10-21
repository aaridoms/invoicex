// Gastos: categorías y cálculos (puro; tests en tests/expenses.test.mjs)

// Categorías pensadas para hostelería, con su cuenta del Plan General
// Contable para la futura exportación al gestor
export const EXPENSE_CATEGORIES = [
  { value: "compras", label: "Compras de comida y bebida", account: "600" },
  { value: "suministros", label: "Suministros (luz, agua, gas)", account: "628" },
  { value: "alquiler", label: "Alquiler del local", account: "621" },
  { value: "reparaciones", label: "Reparaciones y mantenimiento", account: "622" },
  { value: "profesionales", label: "Gestoría y servicios profesionales", account: "623" },
  { value: "seguros", label: "Seguros", account: "625" },
  { value: "bancos", label: "Bancos y comisiones", account: "626" },
  { value: "publicidad", label: "Publicidad y marketing", account: "627" },
  { value: "software", label: "Software, internet y teléfono", account: "629" },
  { value: "transporte", label: "Transporte y mensajería", account: "624" },
  { value: "otros", label: "Otros gastos", account: "629" },
];

export const categoryLabel = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value)?.label || "Otros gastos";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Totales de un gasto a partir de sus líneas de IVA y la retención.
// Si una línea no trae cuota, se calcula a partir de la base y el tipo.
export function computeExpense(vatLines = [], retention = 0) {
  const lines = vatLines
    .map((l) => {
      const base = round2(num(l.base));
      const rate = num(l.rate);
      const cuota =
        l.cuota === "" || l.cuota === undefined || l.cuota === null
          ? round2((base * rate) / 100)
          : round2(num(l.cuota));
      return { rate, base, cuota };
    })
    .filter((l) => l.base !== 0 || l.cuota !== 0);
  const base = round2(lines.reduce((s, l) => s + l.base, 0));
  const vat = round2(lines.reduce((s, l) => s + l.cuota, 0));
  const ret = round2(Math.abs(num(retention)));
  return { lines, base, vat, retention: ret, total: round2(base + vat - ret) };
}
