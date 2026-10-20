// Libro de facturas emitidas en CSV (función pura; tests en tests/csv.test.mjs)
// Formato pensado para Excel en español: separador ";", coma decimal y BOM
// UTF-8 para que las tildes se vean bien al abrirlo directamente.

const BOM = "﻿";

const cell = (v) => {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const decimal = (n) => Number(n || 0).toFixed(2).replace(".", ",");

const isoToEs = (iso) => {
  const [y, m, d] = String(iso || "").split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
};

export function invoicesCsv(rows, issuerName = () => "") {
  const header = [
    "Número",
    "Fecha",
    "Empresa emisora",
    "Cliente",
    "NIF cliente",
    "Base imponible",
    "IVA",
    "Total",
  ];
  const lines = rows.map((r) =>
    [
      r.number,
      isoToEs(r.issue_date),
      issuerName(r.issuer_id),
      r.client?.nombre,
      r.client?.cif,
      decimal(r.base),
      decimal(r.vat),
      decimal(r.total),
    ]
      .map(cell)
      .join(";")
  );
  return BOM + [header.map(cell).join(";"), ...lines].join("\r\n") + "\r\n";
}
