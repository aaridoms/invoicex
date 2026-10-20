// Cálculos del panel de inicio (funciones puras; tests en tests/stats.test.mjs)
// Filas: { issue_date: "aaaa-mm-dd", base, vat, total, client: { nombre } }

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");

export const monthKey = (year, month) => `${year}-${pad(month)}`; // month 1-12

// Los n últimos meses hasta ref (incluido), del más antiguo al más reciente
export function lastMonths(ref, n = 12) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push({
      key: monthKey(d.getFullYear(), d.getMonth() + 1),
      label: MONTHS[d.getMonth()],
      year: d.getFullYear(),
    });
  }
  return out;
}

// Primer día que hace falta cargar para todo el panel
export function dashboardSince(ref) {
  const twelve = new Date(ref.getFullYear(), ref.getMonth() - 11, 1);
  const yearStart = new Date(ref.getFullYear(), 0, 1);
  const d = twelve < yearStart ? twelve : yearStart;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

const empty = () => ({ base: 0, vat: 0, total: 0, count: 0 });
const add = (acc, r) => {
  acc.base = round2(acc.base + Number(r.base || 0));
  acc.vat = round2(acc.vat + Number(r.vat || 0));
  acc.total = round2(acc.total + Number(r.total || 0));
  acc.count += 1;
  return acc;
};

// Base imponible por mes (lo que de verdad se ingresa, sin IVA)
export function monthlySeries(rows, ref, n = 12) {
  const months = lastMonths(ref, n);
  const byKey = new Map(months.map((m) => [m.key, { ...m, ...empty() }]));
  for (const r of rows) {
    const bucket = byKey.get(String(r.issue_date).slice(0, 7));
    if (bucket) add(bucket, r);
  }
  return months.map((m) => byKey.get(m.key));
}

// Variación porcentual; null si no hay base de comparación
export const deltaPct = (current, previous) =>
  previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

export function summarize(rows, ref) {
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1;
  const prev = new Date(year, ref.getMonth() - 1, 1);
  const quarter = Math.floor(ref.getMonth() / 3) + 1;
  const qFirst = (quarter - 1) * 3 + 1;
  const qKeys = [0, 1, 2].map((i) => monthKey(year, qFirst + i));

  const thisMonth = empty();
  const lastMonth = empty();
  const thisYear = empty();
  const thisQuarter = empty();
  const curKey = monthKey(year, month);
  const prevKey = monthKey(prev.getFullYear(), prev.getMonth() + 1);

  for (const r of rows) {
    const key = String(r.issue_date).slice(0, 7);
    if (key === curKey) add(thisMonth, r);
    if (key === prevKey) add(lastMonth, r);
    if (key.startsWith(`${year}-`)) add(thisYear, r);
    if (qKeys.includes(key)) add(thisQuarter, r);
  }

  return {
    month: thisMonth,
    prevMonth: lastMonth,
    monthDelta: deltaPct(thisMonth.base, lastMonth.base),
    year: thisYear,
    quarter: { ...thisQuarter, label: `T${quarter} ${year}` },
    avgTicket: thisYear.count ? round2(thisYear.total / thisYear.count) : 0,
    monthName: new Date(year, ref.getMonth(), 1).toLocaleDateString("es-ES", {
      month: "long",
    }),
  };
}

// Clientes con más facturación (base imponible) en el año de ref
export function topClients(rows, ref, n = 5) {
  const year = `${ref.getFullYear()}-`;
  const byName = new Map();
  let grand = 0;
  for (const r of rows) {
    if (!String(r.issue_date).startsWith(year)) continue;
    const name = (r.client?.nombre || "").trim() || "Sin nombre";
    const key = name.toLowerCase();
    const acc = byName.get(key) || { name, base: 0, count: 0 };
    acc.base = round2(acc.base + Number(r.base || 0));
    acc.count += 1;
    byName.set(key, acc);
    grand += Number(r.base || 0);
  }
  return [...byName.values()]
    .sort((a, b) => b.base - a.base || a.name.localeCompare(b.name, "es"))
    .slice(0, n)
    .map((c) => ({ ...c, share: grand > 0 ? c.base / grand : 0 }));
}

// Marcas "redondas" del eje Y: 0, 1, 2, 2.5, 5 × 10^k
export function niceTicks(max, count = 4) {
  if (!(max > 0)) return [0];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(round2(v));
  return ticks;
}

// 1.250 € -> "1,3 mil €" en los ejes (los importes exactos van en el tooltip)
export const compactEuro = (n) =>
  new Intl.NumberFormat("es-ES", {
    notation: "compact",
    maximumFractionDigits: 1,
    style: "currency",
    currency: "EUR",
  }).format(n);
