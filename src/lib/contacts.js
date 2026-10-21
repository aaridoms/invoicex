// Lógica pura de contactos (tests en tests/contacts.test.mjs)

// "b-12.345.678" -> "B12345678"
export const normalizeTaxId = (s) =>
  String(s ?? "").toUpperCase().replace(/[\s.\-]/g, "");

// Texto comparable: minúsculas, sin tildes y con espacios simples
export const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Identidad de un cliente: su NIF si lo tiene; si no, su nombre
export const clientKey = ({ name, taxId }) => {
  const tax = normalizeTaxId(taxId);
  return tax ? `nif:${tax}` : `nombre:${fold(name)}`;
};

// Agrupa los clientes de facturas sin enlazar. Los datos de la ficha se
// toman de la factura más reciente de cada cliente.
// rows: [{ id, issue_date, client: { nombre, cif, direccion, ciudad } }]
export function groupClientsFromInvoices(rows) {
  const groups = new Map();
  const sorted = [...rows].sort((a, b) =>
    String(b.issue_date).localeCompare(String(a.issue_date))
  );
  for (const r of sorted) {
    const name = String(r.client?.nombre ?? "").trim();
    if (!name) continue;
    const contact = {
      name,
      taxId: normalizeTaxId(r.client?.cif),
      address: String(r.client?.direccion ?? "").trim(),
      city: String(r.client?.ciudad ?? "").trim(),
    };
    const key = clientKey(contact);
    if (!groups.has(key)) groups.set(key, { key, contact, invoiceIds: [] });
    groups.get(key).invoiceIds.push(r.id);
  }
  return [...groups.values()];
}

// Búsqueda para el autocompletado y el listado: por nombre o NIF, sin
// distinguir tildes ni mayúsculas. Primero los que empiezan por el texto.
export function searchContacts(contacts, query, { kind = "all", limit = 8 } = {}) {
  const q = fold(query);
  const qTax = normalizeTaxId(query);
  const byKind = contacts.filter(
    (c) => kind === "all" || (kind === "client" ? c.isClient : c.isSupplier)
  );
  if (!q) return byKind.slice(0, limit);
  const scored = [];
  for (const c of byKind) {
    const name = fold(c.name);
    const tax = normalizeTaxId(c.taxId);
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (qTax && tax.startsWith(qTax)) score = 1;
    else if (name.includes(q)) score = 2;
    if (score >= 0) scored.push([score, c]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name, "es"))
    .slice(0, limit)
    .map(([, c]) => c);
}
