import assert from "node:assert/strict";
import { test } from "node:test";
import { nextNumberCandidates } from "../src/lib/numbering.js";
import { safeNext } from "../src/lib/safeNext.js";

test("sin facturas previas empieza en AAAA-0001", () => {
  assert.deepEqual(nextNumberCandidates(null, 2026, 3), [
    "2026-0001",
    "2026-0002",
    "2026-0003",
  ]);
});

test("conserva prefijo y ceros a la izquierda", () => {
  assert.deepEqual(nextNumberCandidates("2026-0009", 2026, 2), [
    "2026-0010",
    "2026-0011",
  ]);
  assert.deepEqual(nextNumberCandidates("A/015", 2026, 1), ["A/016"]);
});

test("si el número no termina en cifras añade un sufijo", () => {
  assert.deepEqual(nextNumberCandidates("ESPECIAL", 2026, 2), [
    "ESPECIAL-1",
    "ESPECIAL-2",
  ]);
});

test("safeNext solo permite rutas internas", () => {
  assert.equal(safeNext("/invoices"), "/invoices");
  assert.equal(safeNext("https://malicioso.com"), "/");
  assert.equal(safeNext("//malicioso.com"), "/");
  assert.equal(safeNext("/\\malicioso.com"), "/");
  assert.equal(safeNext(undefined), "/");
});
