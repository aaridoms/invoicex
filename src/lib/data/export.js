import { invoiceFilename } from "@/app/helpers/invoiceMath";
import { invoicesCsv } from "@/lib/csv";
import { getSupabase } from "@/lib/supabase/client";
import { strToU8, zipSync } from "fflate";

// Exportación completa del negocio (derecho de portabilidad del RGPD) y
// borrado del negocio o de la cuenta.

const BUCKET = "invoice-pdfs";

async function allInvoices(orgId) {
  const { data, error } = await getSupabase()
    .from("invoices")
    .select("*")
    .eq("org_id", orgId)
    .order("issue_date");
  if (error) throw error;
  return data;
}

// ZIP con datos.json, facturas_emitidas.csv y la carpeta pdfs/.
// onProgress(hechos, total) informa de la descarga de PDFs.
export async function exportOrgArchive({ org, issuers }, onProgress = () => {}) {
  const supabase = getSupabase();
  const invoices = await allInvoices(org.id);
  const names = new Map(issuers.map((i) => [i.id, i.companyName || i.brandTitle]));

  const files = {
    "datos.json": strToU8(
      JSON.stringify(
        { app: "invoicex", exportedAt: new Date().toISOString(), organization: org, issuers, invoices },
        null,
        2
      )
    ),
    "facturas_emitidas.csv": strToU8(invoicesCsv(invoices, (id) => names.get(id) || "")),
  };

  const withPdf = invoices.filter((r) => r.pdf_path);
  let done = 0;
  onProgress(done, withPdf.length);
  // De 4 en 4 para no saturar la conexión
  for (let i = 0; i < withPdf.length; i += 4) {
    await Promise.all(
      withPdf.slice(i, i + 4).map(async (r) => {
        const { data, error } = await supabase.storage.from(BUCKET).download(r.pdf_path);
        if (!error) {
          const folder = issuers.length > 1 ? `${names.get(r.issuer_id) || "empresa"}/` : "";
          // Los PDF ya van comprimidos: se guardan tal cual (level 0)
          files[`pdfs/${folder}${invoiceFilename(r.number)}`] = [
            new Uint8Array(await data.arrayBuffer()),
            { level: 0 },
          ];
        }
        onProgress(++done, withPdf.length);
      })
    );
  }

  const zip = zipSync(files, { level: 6 });
  return new Blob([zip], { type: "application/zip" });
}

// Borra todos los PDF de la organización del almacenamiento
async function removeOrgFiles(orgId) {
  const storage = getSupabase().storage.from(BUCKET);
  for (;;) {
    const { data, error } = await storage.list(orgId, { limit: 100 });
    if (error) throw error;
    if (!data.length) return;
    const { error: rmError } = await storage.remove(data.map((f) => `${orgId}/${f.name}`));
    if (rmError) throw rmError;
  }
}

// Solo el dueño (lo comprueba la función de la base de datos)
export async function deleteOrganization(orgId) {
  await removeOrgFiles(orgId);
  const { error } = await getSupabase().rpc("delete_organization", { p_org: orgId });
  if (error) throw error;
}

// Borra la cuenta y, si eres el dueño, el negocio con todo su contenido
export async function deleteAccount({ orgId, isOwner }) {
  const supabase = getSupabase();
  if (isOwner) await removeOrgFiles(orgId);
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  // El usuario ya no existe: basta con borrar la sesión de este navegador
  await supabase.auth.signOut({ scope: "local" });
}
