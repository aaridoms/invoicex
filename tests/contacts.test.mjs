import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientKey,
  fold,
  groupClientsFromInvoices,
  normalizeTaxId,
  searchContacts,
} from "../src/lib/contacts.js";

test("normalizeTaxId quita espacios, puntos y guiones", () => {
  assert.equal(normalizeTaxId("b-12.345 678"), "B12345678");
  assert.equal(normalizeTaxId(undefined), "");
});

test("fold ignora tildes, mayúsculas y espacios de más", () => {
  assert.equal(fold("  Café   PEÑA "), "cafe pena");
});

test("clientKey usa el NIF si existe y si no el nombre", () => {
  assert.equal(clientKey({ name: "Ana", taxId: "b123" }), "nif:B123");
  assert.equal(clientKey({ name: " Ána  López", taxId: "" }), "nombre:ana lopez");
});

test("groupClientsFromInvoices agrupa por NIF o nombre y usa los datos más recientes", () => {
  const groups = groupClientsFromInvoices([
    { id: "f1", issue_date: "2026-01-10", client: { nombre: "Bar Sol", cif: "B-111", direccion: "Calle Vieja 1" } },
    { id: "f2", issue_date: "2026-05-10", client: { nombre: "Bar Sol S.L.", cif: "b111", direccion: "Calle Nueva 2" } },
    { id: "f3", issue_date: "2026-03-01", client: { nombre: "Particular", cif: "" } },
    { id: "f4", issue_date: "2026-04-01", client: { nombre: "particular", cif: "" } },
    { id: "f5", issue_date: "2026-04-02", client: { nombre: "  ", cif: "" } },
  ]);
  assert.equal(groups.length, 2);
  const sol = groups.find((g) => g.key === "nif:B111");
  assert.equal(sol.contact.name, "Bar Sol S.L.");
  assert.equal(sol.contact.address, "Calle Nueva 2");
  assert.deepEqual(sol.invoiceIds.sort(), ["f1", "f2"]);
  assert.deepEqual(groups.find((g) => g.key === "nombre:particular").invoiceIds.sort(), ["f3", "f4"]);
});

test("searchContacts: primero los que empiezan por el texto, sin tildes", () => {
  const contacts = [
    { name: "Panadería Sol", taxId: "B1", isClient: false, isSupplier: true },
    { name: "Solar Eventos", taxId: "B2", isClient: true, isSupplier: false },
    { name: "Bar El Sol", taxId: "A9", isClient: true, isSupplier: false },
  ];
  assert.deepEqual(searchContacts(contacts, "sol").map((c) => c.name), ["Solar Eventos", "Bar El Sol", "Panadería Sol"]);
  assert.deepEqual(searchContacts(contacts, "sol", { kind: "client" }).map((c) => c.name), ["Solar Eventos", "Bar El Sol"]);
  assert.deepEqual(searchContacts(contacts, "panaderia").map((c) => c.name), ["Panadería Sol"]);
  assert.deepEqual(searchContacts(contacts, "a9").map((c) => c.name), ["Bar El Sol"]);
});
