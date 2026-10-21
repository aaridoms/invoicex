import assert from "node:assert/strict";
import { test } from "node:test";
import { categoryLabel, computeExpense } from "../src/lib/expenses.js";

test("computeExpense suma líneas, calcula cuotas vacías y resta la retención", () => {
  const r = computeExpense(
    [
      { rate: 21, base: "200", cuota: "" },
      { rate: 10, base: "100,50", cuota: "10,05" },
      { rate: 4, base: "", cuota: "" },
    ],
    "-30"
  );
  assert.deepEqual(r.lines, [
    { rate: 21, base: 200, cuota: 42 },
    { rate: 10, base: 100.5, cuota: 10.05 },
  ]);
  assert.equal(r.base, 300.5);
  assert.equal(r.vat, 52.05);
  assert.equal(r.retention, 30);
  assert.equal(r.total, 322.55);
});

test("categoryLabel devuelve la etiqueta o 'Otros gastos'", () => {
  assert.equal(categoryLabel("suministros"), "Suministros (luz, agua, gas)");
  assert.equal(categoryLabel("inventada"), "Otros gastos");
});
