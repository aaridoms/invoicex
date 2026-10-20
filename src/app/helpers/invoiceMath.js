// Cálculos de factura: puros y sin dependencias para poder testearlos.
// Línea de entrada: { concepto, cantidad, precio, iva } (strings o números)

export const VAT_RATES = [10, 21, 4, 0];
export const DEFAULT_VAT = 10;

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Acepta "12,50" además de "12.50"
export const toNumber = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const isEmptyLine = (item) =>
  !String(item.concepto ?? "").trim() && toNumber(item.precio) === 0;

// Calcula cada línea y los totales.
// pricesIncludeVat: el precio introducido ya lleva el IVA (típico en
// hostelería: se parte del total del ticket y se desglosa la base).
export function computeInvoice(items, { pricesIncludeVat = false } = {}) {
  const lines = items
    .filter((item) => !isEmptyLine(item))
    .map((item) => {
      const cantidad = toNumber(item.cantidad);
      const precio = toNumber(item.precio);
      const iva = toNumber(item.iva);
      const rate = iva / 100;
      if (pricesIncludeVat) {
        const gross = round2(cantidad * precio);
        const base = round2(gross / (1 + rate));
        return {
          ...item,
          cantidad,
          iva,
          precioUnitario: precio / (1 + rate),
          base,
          cuota: round2(gross - base),
        };
      }
      const base = round2(cantidad * precio);
      return {
        ...item,
        cantidad,
        iva,
        precioUnitario: precio,
        base,
        cuota: round2(base * rate),
      };
    });

  // Desglose por tipo de IVA. Con precios sin IVA, la cuota se calcula
  // sobre la base agregada de cada tipo; con IVA incluido se suman las
  // cuotas de cada línea para que el total coincida con lo cobrado.
  const groups = new Map();
  for (const line of lines) {
    const g = groups.get(line.iva) || { iva: line.iva, base: 0, cuota: 0 };
    g.base = round2(g.base + line.base);
    g.cuota = round2(g.cuota + line.cuota);
    groups.set(line.iva, g);
  }
  const byRate = [...groups.values()]
    .map((g) =>
      pricesIncludeVat ? g : { ...g, cuota: round2(g.base * (g.iva / 100)) }
    )
    .sort((a, b) => b.iva - a.iva);

  const base = round2(byRate.reduce((s, g) => s + g.base, 0));
  const cuota = round2(byRate.reduce((s, g) => s + g.cuota, 0));
  return { lines, byRate, base, cuota, total: round2(base + cuota) };
}

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: true,
  minimumFractionDigits: 2,
});

// es-ES no agrupa los miles en números de 4 cifras; lo forzamos para que
// "1.250,00 €" se lea igual que "12.500,00 €".
export const formatEuro = (n) => {
  const s = euroFormatter.format(toNumber(n));
  return s.replace(/^(-?)(\d)(\d{3}),/, "$1$2.$3,");
};

// "aaaa-mm-dd" -> "dd/mm/aaaa" sin pasar por Date (evita desfases horarios)
export const formatDate = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

// Los números con "/" (p. ej. "A/015") no son válidos en nombres de archivo
export const invoiceFilename = (nFactura) =>
  `factura_${String(nFactura).replace(/[\\/:*?"<>|\s]+/g, "-")}.pdf`;

export const formatQty = (n) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(
    toNumber(n)
  );
