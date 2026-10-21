import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractInvoiceData,
  findTaxIds,
  isValidTaxId,
  parseAmount,
} from "../src/lib/extract/invoiceText.js";

test("parseAmount entiende formatos español e inglés", () => {
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("1234,56"), 1234.56);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("12.500"), 12500);
  assert.equal(parseAmount("12.50"), 12.5);
  assert.equal(parseAmount("-15,00 €"), -15);
  assert.equal(parseAmount("abc"), null);
});

test("isValidTaxId comprueba la letra o el dígito de control", () => {
  assert.equal(isValidTaxId("12345678Z"), true); // DNI
  assert.equal(isValidTaxId("12345678A"), false);
  assert.equal(isValidTaxId("X1234567L"), true); // NIE
  assert.equal(isValidTaxId("B12345674"), true); // CIF con dígito
  assert.equal(isValidTaxId("B12345675"), false);
  assert.equal(isValidTaxId("Q2826000H"), true); // CIF con letra
});

test("findTaxIds normaliza separadores y descarta números sin control válido", () => {
  assert.deepEqual(
    findTaxIds("CIF: B-12.345.674 · Pedido 12345678 · Cliente ES B87654322 · NIF 12345678Z"),
    ["B12345674", "12345678Z"]
  );
});

// Proveedor de alimentación con varios tipos de IVA
const MAYORISTA = `
DISTRIBUCIONES ALIMENTARIAS DEL SUR S.L.
CIF: B12345674
Polígono Industrial Norte, nave 7 · 41015 Sevilla
FACTURA Nº: FA-2026/00871
Fecha factura: 14/10/2026   Fecha vencimiento: 14/11/2026
Cliente: Restaurante Prueba S.L.  NIF: B87654323
Concepto                      Cant.   Precio    Importe
Aceite de oliva 5L              4     25,00     100,00
Harina 25 kg                    2     10,00      20,00
Refrescos caja 24               3     15,00      45,00
Tipo IVA     Base imponible    Cuota
IVA 10%      100,00            10,00
IVA 4%        20,00             0,80
IVA 21%       45,00             9,45
TOTAL FACTURA                 185,25 €
`;

test("factura de mayorista con varios tipos de IVA", () => {
  const r = extractInvoiceData(MAYORISTA, { ownTaxIds: ["B87654323"] });
  assert.equal(r.supplierTaxId, "B12345674");
  assert.deepEqual(r.taxIds, ["B12345674", "B87654323"]);
  assert.equal(r.supplierName, "DISTRIBUCIONES ALIMENTARIAS DEL SUR S.L.");
  assert.equal(r.date, "2026-10-14");
  assert.equal(r.number, "FA-2026/00871");
  assert.deepEqual(
    r.vatLines.map((v) => [v.rate, v.base, v.cuota]),
    [
      [10, 100, 10],
      [4, 20, 0.8],
      [21, 45, 9.45],
    ]
  );
  assert.equal(r.base, 165);
  assert.equal(r.vat, 20.25);
  assert.equal(r.total, 185.25);
  assert.equal(r.confidence.amounts, "high");
});

test("PDF a dos columnas: el nombre comparte línea con el nº de factura", () => {
  const text = [
    "DISTRIBUCIONES ALIMENTARIAS DEL SUR S.L. FACTURA Nº: FA-2026/00871",
    "CIF: B-12.345.674 Fecha factura: 14/10/2026",
    "IVA 10% 100,00 10,00",
    "TOTAL FACTURA 110,00 €",
  ].join("\n");
  const r = extractInvoiceData(text);
  assert.equal(r.supplierName, "DISTRIBUCIONES ALIMENTARIAS DEL SUR S.L.");
  assert.equal(r.number, "FA-2026/00871");
  assert.equal(r.date, "2026-10-14");
  assert.equal(r.total, 110);
});

test("sin indicar tu NIF, el primero válido se toma como proveedor", () => {
  const r = extractInvoiceData(MAYORISTA.replace("CIF: B12345674\n", ""), {
    ownTaxIds: ["B87654323"],
  });
  assert.equal(r.supplierTaxId, "", "tu propio NIF nunca es el proveedor");
});

// Gestoría: IVA 21 % y retención de IRPF del 15 %
const GESTORIA = `
Asesoría Contable Martínez
NIF 12345678Z
Factura número 2026-118
Sevilla, 3 de octubre de 2026
Servicios de asesoría fiscal y contable, octubre
Base imponible: 200,00 €
IVA (21%): 42,00 €
Retención IRPF (15%): -30,00 €
Total a pagar: 212,00 €
`;

test("factura de profesional con retención de IRPF y fecha en texto", () => {
  const r = extractInvoiceData(GESTORIA);
  assert.equal(r.supplierTaxId, "12345678Z");
  assert.equal(r.supplierName, "Asesoría Contable Martínez");
  assert.equal(r.date, "2026-10-03");
  assert.equal(r.number, "2026-118");
  assert.equal(r.base, 200);
  assert.equal(r.vat, 42);
  assert.equal(r.retention, 30);
  assert.equal(r.total, 212);
  assert.equal(r.confidence.amounts, "high");
});

// Suministro con solo el total y el tipo: se desglosa la base
const LUZ = `
Energía Ejemplo, S.A.U. · CIF A12345674
Factura: E26-554433   Fecha de emisión: 01/10/2026
Periodo de facturación: 01/09/2026 - 30/09/2026
IVA 21% incluido
TOTAL: 121,00 EUR
`;

test("suministro con solo total y tipo de IVA", () => {
  const r = extractInvoiceData(LUZ);
  assert.equal(r.supplierTaxId, "A12345674");
  assert.equal(r.date, "2026-10-01");
  assert.equal(r.number, "E26-554433");
  assert.equal(r.total, 121);
  assert.equal(r.base, 100);
  assert.equal(r.vat, 21);
  assert.deepEqual(r.vatLines, [{ rate: 21, base: 100, cuota: 21 }]);
});

test("una cantidad seguida de un importe no se funde en un número", () => {
  const r = extractInvoiceData("Producto 2 100,00\nBase imponible 100,00\nIVA 10% 100,00 10,00\nTotal: 110,00");
  assert.equal(r.base, 100);
  assert.equal(r.total, 110);
});

test("texto sin datos reconocibles no inventa nada", () => {
  const r = extractInvoiceData("Gracias por su visita");
  assert.equal(r.supplierTaxId, "");
  assert.equal(r.date, "");
  assert.equal(r.total, null);
  assert.equal(r.confidence.amounts, null);
});
