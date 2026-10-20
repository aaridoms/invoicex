import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dashboardSince,
  deltaPct,
  lastMonths,
  monthlySeries,
  niceTicks,
  summarize,
  topClients,
} from "../src/lib/stats.js";

const ref = new Date(2026, 9, 20); // 20 de octubre de 2026

const rows = [
  { issue_date: "2026-10-05", base: 100, vat: 10, total: 110, client: { nombre: "Ana" } },
  { issue_date: "2026-10-18", base: 50, vat: 10.5, total: 60.5, client: { nombre: "Luis" } },
  { issue_date: "2026-09-30", base: 200, vat: 20, total: 220, client: { nombre: "ana" } },
  { issue_date: "2026-07-01", base: 300, vat: 30, total: 330, client: { nombre: "Bea" } },
  { issue_date: "2025-12-15", base: 999, vat: 99.9, total: 1098.9, client: { nombre: "Ana" } },
];

test("lastMonths cruza el cambio de año", () => {
  const m = lastMonths(new Date(2026, 1, 10), 3);
  assert.deepEqual(m.map((x) => x.key), ["2025-12", "2026-01", "2026-02"]);
  assert.equal(m[0].label, "dic");
});

test("dashboardSince cubre 12 meses y el año entero", () => {
  assert.equal(dashboardSince(ref), "2025-11-01");
  assert.equal(dashboardSince(new Date(2026, 11, 31)), "2026-01-01");
});

test("monthlySeries suma la base por mes", () => {
  const s = monthlySeries(rows, ref, 12);
  assert.equal(s.length, 12);
  assert.equal(s.at(-1).key, "2026-10");
  assert.equal(s.at(-1).base, 150);
  assert.equal(s.at(-2).base, 200);
  assert.equal(s.find((m) => m.key === "2025-12").base, 999);
});

test("summarize: mes, mes anterior, año y trimestre", () => {
  const r = summarize(rows, ref);
  assert.equal(r.month.base, 150);
  assert.equal(r.month.count, 2);
  assert.equal(r.prevMonth.base, 200);
  assert.equal(r.monthDelta, -25);
  assert.equal(r.year.base, 650);
  assert.equal(r.quarter.label, "T4 2026");
  assert.equal(r.quarter.vat, 20.5);
});

test("deltaPct sin mes anterior devuelve null", () => {
  assert.equal(deltaPct(100, 0), null);
  assert.equal(deltaPct(150, 100), 50);
});

test("topClients agrupa sin distinguir mayúsculas y solo del año", () => {
  const top = topClients(rows, ref);
  // Ana (100 + 200) empata con Bea (300): desempate alfabético
  assert.deepEqual(top.map((c) => c.name), ["Ana", "Bea", "Luis"]);
  assert.equal(top[0].base, 300);
  assert.equal(top[0].count, 2);
  assert.ok(Math.abs(top[0].share - 300 / 650) < 1e-9);
});

test("niceTicks da marcas redondas", () => {
  assert.deepEqual(niceTicks(0), [0]);
  assert.deepEqual(niceTicks(950), [0, 250, 500, 750, 1000]);
  assert.deepEqual(niceTicks(3400, 4), [0, 1000, 2000, 3000, 4000]);
});
