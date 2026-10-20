import { getSupabase } from "@/lib/supabase/client";

// Datos del negocio (organizations) con sus ajustes de facturación

// Columnas que se leen en el layout (junto con los emisores)
export const ORG_COLUMNS =
  "id, name, default_vat, default_prices_include_vat, default_notes, number_prefix, number_digits";

export const orgFromRow = (r) => ({
  id: r.id,
  name: r.name,
  billing: {
    defaultVat: Number(r.default_vat ?? 10),
    defaultPricesIncludeVat: !!r.default_prices_include_vat,
    defaultNotes: r.default_notes ?? "",
    numberPrefix: r.number_prefix ?? "{AAAA}-",
    numberDigits: Number(r.number_digits ?? 4),
  },
});

// Solo dueños y administradores (lo impone la política RLS de update)
export async function updateOrg(orgId, { name, billing }) {
  const { error } = await getSupabase()
    .from("organizations")
    .update({
      name: name.trim(),
      default_vat: billing.defaultVat,
      default_prices_include_vat: billing.defaultPricesIncludeVat,
      default_notes: billing.defaultNotes,
      number_prefix: billing.numberPrefix,
      number_digits: billing.numberDigits,
    })
    .eq("id", orgId);
  if (error) throw error;
}
