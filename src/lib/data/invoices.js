import { buildInvoicePdf, invoiceFilename } from "@/app/helpers/generatePDF";
import { nextNumberCandidates } from "@/lib/numbering";
import { getSupabase } from "@/lib/supabase/client";

// Facturas emitidas: filas en la tabla invoices + PDF en el bucket
// invoice-pdfs/<org_id>/<invoice_id>.pdf

const BUCKET = "invoice-pdfs";

// Lo que se guarda del emisor dentro de cada factura (sin el logo, que
// ocupa mucho; el PDF guardado ya lo lleva)
const issuerSnapshot = (issuer) => ({
  brandTitle: issuer.brandTitle,
  companyName: issuer.companyName,
  cif: issuer.cif,
  address1: issuer.address1,
  address2: issuer.address2,
  email: issuer.email,
  footerNote: issuer.footerNote,
});

// Fila de la BD -> objeto "invoice" que entienden el editor y el PDF
export const toInvoice = (row) => ({
  nFactura: row.number,
  fecha: row.issue_date,
  cliente: row.client || {},
  items: row.items || [],
  pricesIncludeVat: row.prices_include_vat,
  notas: row.notes || "",
});

export async function listInvoices(orgId) {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select(
      "id, issuer_id, number, issue_date, client, total, pdf_path, created_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getInvoice(id) {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function invoiceNumberExists(issuerId, number) {
  const { count, error } = await getSupabase()
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("issuer_id", issuerId)
    .eq("number", number);
  if (error) throw error;
  return count > 0;
}

// Siguiente número libre para un emisor
export async function suggestNextInvoiceNumber(issuerId) {
  const supabase = getSupabase();
  const { data: last, error } = await supabase
    .from("invoices")
    .select("number")
    .eq("issuer_id", issuerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;

  const candidates = nextNumberCandidates(last?.number, new Date().getFullYear());
  const { data: taken, error: takenError } = await supabase
    .from("invoices")
    .select("number")
    .eq("issuer_id", issuerId)
    .in("number", candidates);
  if (takenError) throw takenError;
  const used = new Set(taken.map((r) => r.number));
  return candidates.find((c) => !used.has(c)) ?? candidates[candidates.length - 1];
}

// Emite una factura: guarda la fila, sube el PDF y lo enlaza.
// Devuelve { row, doc } para que el llamador descargue el PDF.
export async function issueInvoice({ orgId, issuer, invoice }) {
  const supabase = getSupabase();
  const { doc, calc } = buildInvoicePdf(invoice, issuer);

  const { data: row, error } = await supabase
    .from("invoices")
    .insert({
      org_id: orgId,
      issuer_id: issuer.id,
      number: invoice.nFactura,
      issue_date: invoice.fecha,
      issuer_snapshot: issuerSnapshot(issuer),
      client: invoice.cliente,
      items: calc.lines.map(({ id, concepto, cantidad, precio, iva }) => ({
        id,
        concepto,
        cantidad,
        precio,
        iva,
      })),
      prices_include_vat: !!invoice.pricesIncludeVat,
      notes: invoice.notas || "",
      base: calc.base,
      vat: calc.cuota,
      total: calc.total,
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `Ya existe la factura ${invoice.nFactura}. Usa otro número para no duplicarla.`
      );
    }
    throw error;
  }

  // El PDF se sube después: si fallara, la factura queda guardada y el PDF
  // se puede regenerar a partir de sus datos al descargarla.
  const path = `${orgId}/${row.id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, doc.output("blob"), { contentType: "application/pdf" });
  if (!uploadError) {
    await supabase.from("invoices").update({ pdf_path: path }).eq("id", row.id);
  } else {
    console.error("Subida del PDF:", uploadError);
  }

  return { row, doc, filename: invoiceFilename(invoice.nFactura) };
}

// PDF de una factura: el guardado si existe; si no, se regenera
export async function downloadInvoicePdf(id, currentIssuers = []) {
  const supabase = getSupabase();
  const row = await getInvoice(id);
  const filename = invoiceFilename(row.number);
  if (row.pdf_path) {
    const { data, error } = await supabase.storage.from(BUCKET).download(row.pdf_path);
    if (!error) return { blob: data, filename };
  }
  const logo = currentIssuers.find((i) => i.id === row.issuer_id)?.logoDataUrl || "";
  const { doc } = buildInvoicePdf(toInvoice(row), {
    ...row.issuer_snapshot,
    logoDataUrl: logo,
  });
  return { blob: doc.output("blob"), filename };
}

// TEMPORAL hasta tener rectificativas (solo el dueño, lo impone la BD)
export async function deleteInvoice(id) {
  const supabase = getSupabase();
  const row = await getInvoice(id);
  if (row.pdf_path) await supabase.storage.from(BUCKET).remove([row.pdf_path]);
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}
