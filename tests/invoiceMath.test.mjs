import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeInvoice,
  formatEuro,
  toNumber,
} from "../src/app/helpers/invoiceMath.js";

test("precios sin IVA: base, cuota y total", () => {
  const r = computeInvoice([
    { concepto: "Menú", cantidad: "3", precio: "15", iva: 10 },
    { concepto: "Vino", cantidad: "1", precio: "20,50", iva: 10 },
  ]);
  assert.equal(r.base, 65.5);
  assert.equal(r.cuota, 6.55);
  assert.equal(r.total, 72.05);
});

test("precios con IVA incluido: el total coincide con lo cobrado", () => {
  const r = computeInvoice(
    [{ concepto: "Comida de grupo", cantidad: 1, precio: "100", iva: 10 }],
    { pricesIncludeVat: true }
  );
  assert.equal(r.total, 100);
  assert.equal(r.base, 90.91);
  assert.equal(r.cuota, 9.09);
});

test("varios tipos de IVA se desglosan por separado", () => {
  const r = computeInvoice([
    { concepto: "Comida", cantidad: 1, precio: 100, iva: 10 },
    { concepto: "Alquiler sala", cantidad: 1, precio: 50, iva: 21 },
  ]);
  assert.deepEqual(
    r.byRate.map((g) => [g.iva, g.base, g.cuota]),
    [
      [21, 50, 10.5],
      [10, 100, 10],
    ]
  );
  assert.equal(r.total, 170.5);
});

test("las líneas vacías se ignoran", () => {
  const r = computeInvoice([
    { concepto: "", cantidad: 1, precio: "", iva: 10 },
    { concepto: "Café", cantidad: 2, precio: "1.5", iva: 10 },
  ]);
  assert.equal(r.lines.length, 1);
  assert.equal(r.total, 3.3);
});

test("toNumber acepta coma decimal y valores vacíos", () => {
  assert.equal(toNumber("12,5"), 12.5);
  assert.equal(toNumber(""), 0);
  assert.equal(toNumber("abc"), 0);
});

test("formatEuro agrupa miles también con 4 cifras", () => {
  const clean = (s) => s.replace(/\s/g, " ");
  assert.equal(clean(formatEuro(1250)), "1.250,00 €");
  assert.equal(clean(formatEuro(12500.5)), "12.500,50 €");
  assert.equal(clean(formatEuro(9.9)), "9,90 €");
});
