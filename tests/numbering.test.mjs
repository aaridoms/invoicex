import assert from "node:assert/strict";
import { test } from "node:test";
import {
  expandPrefix,
  likePrefix,
  nextNumberCandidates,
  nextSeriesNumber,
} from "../src/lib/numbering.js";

test("expandPrefix sustituye el año", () => {
  assert.equal(expandPrefix("{AAAA}-", 2026), "2026-");
  assert.equal(expandPrefix("F{AA}/", 2026), "F26/");
  assert.equal(expandPrefix("A/", 2026), "A/");
});

test("nextSeriesNumber continúa la serie y se reinicia con el año", () => {
  const used = ["2026-0001", "2026-0007", "2025-0040", "ESPECIAL", "2026-07b"];
  assert.equal(nextSeriesNumber("{AAAA}-", 4, 2026, used), "2026-0008");
  assert.equal(nextSeriesNumber("{AAAA}-", 4, 2027, used), "2027-0001");
  assert.equal(nextSeriesNumber("A/", 3, 2026, ["A/009", "A/010"]), "A/011");
  assert.equal(nextSeriesNumber("{AAAA}-", 4, 2026, []), "2026-0001");
});

test("likePrefix escapa los comodines de LIKE", () => {
  assert.equal(likePrefix("2026-"), "2026-%");
  assert.equal(likePrefix("A_1%"), "A\\_1\\%%");
});
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
