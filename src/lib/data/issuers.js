import { getSupabase } from "@/lib/supabase/client";

// Emisores (empresas que firman las facturas). La interfaz usa los mismos
// nombres de campo que el PDF; aquí se traducen a las columnas de la BD.

export const issuerFromRow = (r) => ({
  id: r.id,
  brandTitle: r.brand_title,
  companyName: r.company_name,
  cif: r.tax_id,
  address1: r.address1,
  address2: r.address2,
  email: r.email,
  logoDataUrl: r.logo_data_url,
  footerNote: r.footer_note,
});

const toRow = (f) => ({
  brand_title: (f.brandTitle || "").trim(),
  company_name: (f.companyName || "").trim(),
  tax_id: (f.cif || "").trim(),
  address1: (f.address1 || "").trim(),
  address2: (f.address2 || "").trim(),
  email: (f.email || "").trim(),
  logo_data_url: f.logoDataUrl || "",
  footer_note: f.footerNote || "",
});

export async function listIssuers(orgId) {
  const { data, error } = await getSupabase()
    .from("issuers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at");
  if (error) throw error;
  return data.map(issuerFromRow);
}

export async function createIssuer(orgId, fields) {
  const { data, error } = await getSupabase()
    .from("issuers")
    .insert({ org_id: orgId, ...toRow(fields) })
    .select()
    .single();
  if (error) throw error;
  return issuerFromRow(data);
}

export async function updateIssuer(id, fields) {
  const { data, error } = await getSupabase()
    .from("issuers")
    .update(toRow(fields))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return issuerFromRow(data);
}

export async function deleteIssuer(id) {
  const { error } = await getSupabase().from("issuers").delete().eq("id", id);
  if (error) {
    // 23503: clave foránea; el emisor tiene facturas
    if (error.code === "23503") {
      throw new Error("No se puede eliminar: esta empresa ya tiene facturas emitidas.");
    }
    throw error;
  }
}

// Emisor elegido por última vez en este navegador (preferencia de interfaz)
const LAST_ISSUER_KEY = "invoicex:last-issuer";

export function rememberIssuer(id) {
  try {
    localStorage.setItem(LAST_ISSUER_KEY, id);
  } catch {}
}

export function lastIssuerId() {
  try {
    return localStorage.getItem(LAST_ISSUER_KEY);
  } catch {
    return null;
  }
}
