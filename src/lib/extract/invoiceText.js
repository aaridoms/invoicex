// Extracción de datos de una factura recibida a partir de su TEXTO (el que
// llevan dentro los PDF digitales). Sin IA ni servicios externos: patrones
// y comprobaciones. Todo lo que devuelve es una propuesta a revisar.
// Tests en tests/extract.test.mjs.

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// ---------------------------------------------------------------------------
// Importes
// ---------------------------------------------------------------------------

// "1.234,56" | "1234,56" | "1,234.56" | "1234.56" | "12.500" -> número
export function parseAmount(raw) {
  let s = String(raw).replace(/[€\s]|EUR/gi, "");
  const neg = s.startsWith("-");
  s = s.replace(/^-/, "");
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  let n;
  if (lastDot >= 0 && lastComma >= 0) {
    // El último separador es el decimal
    n =
      lastComma > lastDot
        ? Number(s.replace(/\./g, "").replace(",", "."))
        : Number(s.replace(/,/g, ""));
  } else if (lastComma >= 0) {
    n = Number(s.replace(/,(?=\d{3}(\D|$))(?!\d{1,2}$)/g, "").replace(",", "."));
  } else if (lastDot >= 0) {
    // Solo puntos: con 3 cifras tras el último es separador de miles
    const decimals = s.length - lastDot - 1;
    n = decimals === 3 ? Number(s.replace(/\./g, "")) : Number(s);
  } else {
    n = Number(s);
  }
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

// Importes de una línea (con dos decimales, para no confundirlos con
// cantidades o códigos), en orden de aparición. Los miles solo con "." o
// ",": admitir espacios uniría "2 100,00" (cantidad + importe) en 2.100.
function amountsIn(line) {
  const out = [];
  const re = /-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}(?!\d)|-?\d+[.,]\d{2}(?!\d)/g;
  for (const m of line.matchAll(re)) {
    const v = parseAmount(m[0]);
    if (v !== null) out.push(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// NIF / CIF / NIE con validación del carácter de control
// ---------------------------------------------------------------------------

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

export function isValidTaxId(id) {
  const s = String(id).toUpperCase();
  if (/^\d{8}[A-Z]$/.test(s)) {
    return DNI_LETTERS[Number(s.slice(0, 8)) % 23] === s[8];
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(s)) {
    const num = "XYZ".indexOf(s[0]) + s.slice(1, 8);
    return DNI_LETTERS[Number(num) % 23] === s[8];
  }
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(s)) {
    const digits = s.slice(1, 8);
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      let d = Number(digits[i]);
      if (i % 2 === 0) {
        d *= 2;
        d = Math.floor(d / 10) + (d % 10);
      }
      sum += d;
    }
    const control = (10 - (sum % 10)) % 10;
    const letter = "JABCDEFGHI"[control];
    return s[8] === String(control) || s[8] === letter;
  }
  return false;
}

// NIF válidos que aparecen en el texto, en orden y sin repetir
export function findTaxIds(text) {
  const found = [];
  const re = /\b(?:ES)?[A-Z0-9](?:[.\- ]?[A-Z0-9]){7,9}\b/gi;
  for (const m of String(text).matchAll(re)) {
    const id = m[0].toUpperCase().replace(/[.\- ]/g, "").replace(/^ES(?=[A-Z0-9]{9}$)/, "");
    if (id.length === 9 && isValidTaxId(id) && !found.includes(id)) found.push(id);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const pad = (n) => String(n).padStart(2, "0");

const toIso = (y, m, d) => {
  const year = y < 100 ? 2000 + y : y;
  const date = new Date(year, m - 1, d);
  if (date.getFullYear() !== year || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  if (year < 2000 || year > 2100) return null;
  return `${year}-${pad(m)}-${pad(d)}`;
};

function datesIn(line) {
  const out = [];
  const f = fold(line);
  for (const m of f.matchAll(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4}|\d{2})\b/g)) {
    const iso = toIso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) out.push(iso);
  }
  for (const m of f.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    const iso = toIso(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) out.push(iso);
  }
  for (const m of f.matchAll(/\b(\d{1,2}) de ([a-z]+) de (\d{4})\b/g)) {
    const month = MONTHS[m[2]];
    const iso = month && toIso(Number(m[3]), month, Number(m[1]));
    if (iso) out.push(iso);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Extracción principal
// ---------------------------------------------------------------------------

const STANDARD_RATES = [21, 10, 5, 4, 0];
const nearestRate = (rate) =>
  STANDARD_RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best));

// Busca la etiqueta en las líneas y devuelve el último importe de esa línea
// (o el primero de la siguiente si la etiqueta va sola). Se queda con la
// última coincidencia: los totales suelen ir al final del documento.
function labeledAmount(lines, labelRe, excludeRe) {
  let value = null;
  lines.forEach((line, i) => {
    const f = fold(line);
    if (!labelRe.test(f) || (excludeRe && excludeRe.test(f))) return;
    const own = amountsIn(line);
    const next = own.length ? own : amountsIn(lines[i + 1] || "");
    if (next.length) value = own.length ? own[own.length - 1] : next[0];
  });
  return value;
}

// ownTaxIds: NIF de tus propias empresas (el comprador), para no tomarlos
// como el del proveedor
export function extractInvoiceData(text, { ownTaxIds = [] } = {}) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const own = new Set(ownTaxIds.map((t) => String(t).toUpperCase().replace(/[.\- ]/g, "")));

  // Proveedor: primer NIF válido que no sea tuyo
  const taxIds = findTaxIds(text);
  const supplierTaxId = taxIds.find((t) => !own.has(t)) || "";
  let supplierName = "";
  if (supplierTaxId) {
    const idx = lines.findIndex((l) =>
      l.toUpperCase().replace(/[.\- ]/g, "").includes(supplierTaxId)
    );
    // El nombre suele ir justo encima del NIF. En PDF a dos columnas la
    // misma línea trae también "FACTURA Nº…" o "Fecha…": se corta ahí.
    const candidate = (idx > 0 ? lines[idx - 1] : "")
      .split(/\s+(?:factura|fra\.|fecha|n[ºo°]\s*:|invoice)\b/i)[0]
      .trim();
    if (candidate && /[a-z]{3}/i.test(candidate) && !/\d{5}/.test(candidate)) {
      supplierName = candidate.replace(/^(proveedor|emisor|raz[oó]n social)\s*:?\s*/i, "");
    }
  }

  // Fecha: la de la línea "Fecha (de factura/emisión)"; si no, la primera
  let date = "";
  for (const line of lines) {
    const f = fold(line);
    if (/fecha/.test(f) && !/venc|pedido|entrega|albaran|pago/.test(f)) {
      const d = datesIn(line);
      if (d.length) {
        date = d[0];
        break;
      }
    }
  }
  if (!date) date = lines.flatMap(datesIn)[0] || "";

  // Número de factura
  let number = "";
  for (const line of lines) {
    const m = line.match(
      /(?:factura|fra\.?|invoice)\s*(?:n[ºo°.]|n[uú]m(?:ero)?\.?|number|#)?\s*[:.]?\s*([A-Z0-9][A-Z0-9\-/.]{1,24})/i
    );
    if (!m) continue;
    const token = m[1].replace(/[.\-/]+$/, "");
    const looksLikeDate = datesIn(token).length > 0;
    if (/\d/.test(token) && !looksLikeDate && !isValidTaxId(token)) {
      number = token;
      break;
    }
  }

  // Desglose por tipo de IVA: líneas con un % estándar y dos importes
  // (base y cuota) coherentes entre sí
  const vatLines = [];
  for (const line of lines) {
    const f = fold(line);
    if (!/iva|i\.v\.a|%/.test(f) || /irpf|retenc/.test(f)) continue;
    const rateMatch = f.match(/(\d{1,2})(?:[.,]0{1,2})?\s*%/);
    if (!rateMatch) continue;
    const rate = Number(rateMatch[1]);
    if (!STANDARD_RATES.includes(rate)) continue;
    // El "%" ya se quita del texto: no filtrar por valor, que una cuota
    // puede coincidir con el tipo (IVA 10 % de 100,00 = 10,00)
    const amounts = amountsIn(line.replace(rateMatch[0], " "));
    if (amounts.length < 2) continue;
    const base = amounts[amounts.length - 2];
    const cuota = amounts[amounts.length - 1];
    if (Math.abs(round2((base * rate) / 100) - cuota) <= 0.05) {
      const dup = vatLines.some((v) => v.rate === rate && v.base === base && v.cuota === cuota);
      if (!dup) vatLines.push({ rate, base, cuota });
    }
  }

  const total = labeledAmount(
    lines,
    /(total (factura|a pagar|eur|€)|importe total|^total\b|\btotal:)/,
    /base|subtotal|iva|bruto|neto|lineas|unidades|cantidad|dto|descuento/
  );
  let base = labeledAmount(lines, /(base imponible|^base\b|subtotal|importe neto|^neto\b)/, /total/);
  let vat = labeledAmount(lines, /(cuota (de )?iva|total iva|\biva\b|i\.v\.a)/, /base|irpf|retenc|incluido/);
  // La retención suele imprimirse en negativo: se trabaja con su valor absoluto
  const retention = Math.abs(labeledAmount(lines, /(retencion|irpf)/) ?? 0);
  const rateOnly = (() => {
    for (const line of lines) {
      const m = fold(line).match(/iva[^%\d]*(\d{1,2})\s*%/);
      if (m && STANDARD_RATES.includes(Number(m[1]))) return Number(m[1]);
    }
    return null;
  })();

  // Consolidar importes
  if (vatLines.length) {
    base = round2(vatLines.reduce((s, v) => s + v.base, 0));
    vat = round2(vatLines.reduce((s, v) => s + v.cuota, 0));
  } else if (base !== null && vat !== null && base > 0) {
    vatLines.push({ rate: nearestRate((vat / base) * 100), base, cuota: vat });
  } else if (total !== null && rateOnly !== null) {
    base = round2((total + retention) / (1 + rateOnly / 100));
    vat = round2(total + retention - base);
    vatLines.push({ rate: rateOnly, base, cuota: vat });
  } else if (base !== null && total !== null) {
    vat = round2(total + retention - base);
    vatLines.push({ rate: nearestRate(base ? (vat / base) * 100 : 0), base, cuota: vat });
  }

  const computedTotal =
    base !== null && vat !== null ? round2(base + vat - retention) : null;
  const consistent =
    computedTotal !== null && total !== null && Math.abs(computedTotal - total) <= 0.02;

  return {
    supplierTaxId,
    supplierName,
    taxIds,
    date,
    number,
    vatLines,
    base: base ?? null,
    vat: vat ?? null,
    retention,
    total: total ?? computedTotal,
    confidence: {
      supplier: supplierTaxId ? "high" : null,
      date: date ? "high" : null,
      number: number ? "medium" : null,
      // Alta solo si base + IVA − retención cuadra con el total impreso
      amounts: consistent ? "high" : vatLines.length || total !== null ? "low" : null,
    },
  };
}
