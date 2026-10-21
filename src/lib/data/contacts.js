import { clientKey, groupClientsFromInvoices, normalizeTaxId } from "@/lib/contacts";
import { getSupabase } from "@/lib/supabase/client";

// Contactos (clientes y proveedores) del negocio

export const contactFromRow = (r) => ({
  id: r.id,
  name: r.name,
  taxId: r.tax_id,
  address: r.address,
  city: r.city,
  email: r.email,
  phone: r.phone,
  notes: r.notes,
  isClient: r.is_client,
  isSupplier: r.is_supplier,
});

const toRow = (c) => ({
  name: (c.name || "").trim(),
  tax_id: normalizeTaxId(c.taxId),
  address: (c.address || "").trim(),
  city: (c.city || "").trim(),
  email: (c.email || "").trim(),
  phone: (c.phone || "").trim(),
  notes: c.notes || "",
  is_client: !!c.isClient,
  is_supplier: !!c.isSupplier,
});

// Mensaje claro para el NIF repetido (índice único por negocio)
function friendly(error) {
  if (error?.code === "23505") {
    return new Error("Ya existe un contacto con ese NIF/CIF.");
  }
  return error;
}

export async function listContacts(orgId) {
  const { data, error } = await getSupabase()
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw error;
  return data.map(contactFromRow);
}

export async function createContact(orgId, fields) {
  const { data, error } = await getSupabase()
    .from("contacts")
    .insert({ org_id: orgId, ...toRow(fields) })
    .select()
    .single();
  if (error) throw friendly(error);
  return contactFromRow(data);
}

export async function updateContact(id, fields) {
  const { data, error } = await getSupabase()
    .from("contacts")
    .update(toRow(fields))
    .eq("id", id)
    .select()
    .single();
  if (error) throw friendly(error);
  return contactFromRow(data);
}

// Las facturas enlazadas conservan sus datos; solo pierden el enlace
export async function deleteContact(id) {
  const { error } = await getSupabase().from("contacts").delete().eq("id", id);
  if (error) throw error;
}

// Nº de facturas y total facturado por cliente: Map(contactId -> { count, total })
export async function clientInvoiceStats(orgId) {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("client_id, total")
    .eq("org_id", orgId)
    .not("client_id", "is", null);
  if (error) throw error;
  const stats = new Map();
  for (const r of data) {
    const s = stats.get(r.client_id) || { count: 0, total: 0 };
    s.count += 1;
    s.total = Math.round((s.total + Number(r.total || 0)) * 100) / 100;
    stats.set(r.client_id, s);
  }
  return stats;
}

// Crea fichas de cliente a partir de las facturas sin enlazar y las enlaza.
// Si ya existe un contacto con el mismo NIF (o nombre, sin NIF), se reutiliza.
export async function importClientsFromInvoices(orgId, existing) {
  const supabase = getSupabase();
  const { data: rows, error } = await supabase
    .from("invoices")
    .select("id, issue_date, client")
    .eq("org_id", orgId)
    .is("client_id", null);
  if (error) throw error;

  const groups = groupClientsFromInvoices(rows);
  if (groups.length === 0) return { created: 0, linked: 0 };

  const byKey = new Map(existing.map((c) => [clientKey(c), c]));
  const missing = groups.filter((g) => !byKey.has(g.key));
  if (missing.length) {
    const { data: inserted, error: insError } = await supabase
      .from("contacts")
      .insert(
        missing.map((g) => ({
          org_id: orgId,
          ...toRow({ ...g.contact, isClient: true, isSupplier: false }),
        }))
      )
      .select();
    if (insError) throw friendly(insError);
    for (const row of inserted) {
      const c = contactFromRow(row);
      byKey.set(clientKey(c), c);
    }
  }

  let linked = 0;
  for (const g of groups) {
    const contact = byKey.get(g.key);
    if (!contact) continue;
    const { error: upError } = await supabase
      .from("invoices")
      .update({ client_id: contact.id })
      .in("id", g.invoiceIds);
    if (upError) throw upError;
    linked += g.invoiceIds.length;
  }
  return { created: missing.length, linked };
}
