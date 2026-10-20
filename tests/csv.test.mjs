import assert from "node:assert/strict";
import { test } from "node:test";
import { invoicesCsv } from "../src/lib/csv.js";

test("CSV del libro de facturas: cabecera, formato español y comillas", () => {
  const csv = invoicesCsv(
    [
      {
        number: "2026-0001",
        issue_date: "2026-10-05",
        issuer_id: "e1",
        client: { nombre: 'Bar "El Puerto"; S.L.', cif: "B123" },
        base: 100,
        vat: 10,
        total: 110,
      },
    ],
    (id) => (id === "e1" ? "Ejemplo S.L." : "")
  );
  assert.ok(csv.startsWith("﻿"), "lleva BOM para Excel");
  const [header, row] = csv.slice(1).trim().split("\r\n");
  assert.equal(
    header,
    "Número;Fecha;Empresa emisora;Cliente;NIF cliente;Base imponible;IVA;Total"
  );
  assert.equal(
    row,
    '2026-0001;05/10/2026;Ejemplo S.L.;"Bar ""El Puerto""; S.L.";B123;100,00;10,00;110,00'
  );
});

test("CSV vacío solo tiene la cabecera", () => {
  const lines = invoicesCsv([]).slice(1).trim().split("\r\n");
  assert.equal(lines.length, 1);
});
