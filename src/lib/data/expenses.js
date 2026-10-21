import { computeExpense } from "@/lib/expenses";
import { getSupabase } from "@/lib/supabase/client";

// Gastos (facturas recibidas) y su archivo en expense-files/<org>/<gasto>/<nombre>

const BUCKET = "expense-files";

export const expenseFromRow = (r) => ({
  id: r.id,
  supplierId: r.supplier_id,
  supplier: { nombre: r.supplier?.nombre || "", cif: r.supplier?.cif || "" },
  number: r.number,
  issueDate: r.issue_date,
  category: r.category,
  vatLines: r.vat_lines || [],
  base: Number(r.base),
  vat: Number(r.vat),
  retention: Number(r.retention),
  total: Number(r.total),
  notes: r.notes,
  filePath: r.file_path,
  fileName: r.file_name,
});

const LIST_COLUMNS =
  "id, supplier_id, supplier, number, issue_date, category, base, vat, retention, total, file_path, file_name";

export async function listExpenses(orgId) {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select(LIST_COLUMNS)
    .eq("org_id", orgId)
    .order("issue_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(expenseFromRow);
}

// Para el panel de inicio: gastos desde una fecha "aaaa-mm-dd"
export async function listExpensesSince(orgId, since) {
  const { data, error } = await getSupabase()
    .from("expenses")
    .select("issue_date, base, vat, total")
    .eq("org_id", orgId)
    .gte("issue_date", since);
  if (error) throw error;
  return data;
}

export async function getExpense(id) {
  const { data, error } = await getSupabase().from("expenses").select("*").eq("id", id).single();
  if (error) throw error;
  return expenseFromRow(data);
}

// Nombre de archivo seguro para la ruta del almacenamiento
const safeName = (name) =>
  String(name || "documento")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-80);

// Crea o actualiza un gasto. file: File nuevo a adjuntar (opcional); si ya
// había uno, se sustituye.
export async function saveExpense({ orgId, id, form, file }) {
  const supabase = getSupabase();
  const calc = computeExpense(form.vatLines, form.retention);
  const row = {
    supplier_id: form.supplierId || null,
    supplier: { nombre: form.supplier.nombre.trim(), cif: form.supplier.cif.trim() },
    number: form.number.trim(),
    issue_date: form.issueDate,
    category: form.category,
    vat_lines: calc.lines,
    base: calc.base,
    vat: calc.vat,
    retention: calc.retention,
    total: calc.total,
    notes: form.notes || "",
  };

  let saved;
  if (id) {
    const { data, error } = await supabase.from("expenses").update(row).eq("id", id).select().single();
    if (error) throw error;
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("expenses")
      .insert({ org_id: orgId, ...row })
      .select()
      .single();
    if (error) throw error;
    saved = data;
  }

  if (file) {
    const path = `${orgId}/${saved.id}/${Date.now()}_${safeName(file.name)}`;
    const { error: upError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });
    if (upError) {
      throw new Error(
        "El gasto se ha guardado, pero no se pudo subir el archivo. Inténtalo de nuevo desde la ficha."
      );
    }
    if (saved.file_path) await supabase.storage.from(BUCKET).remove([saved.file_path]);
    const { data, error } = await supabase
      .from("expenses")
      .update({ file_path: path, file_name: file.name })
      .eq("id", saved.id)
      .select()
      .single();
    if (error) throw error;
    saved = data;
  }

  return expenseFromRow(saved);
}

export async function deleteExpense(expense) {
  const supabase = getSupabase();
  if (expense.filePath) await supabase.storage.from(BUCKET).remove([expense.filePath]);
  const { error } = await supabase.from("expenses").delete().eq("id", expense.id);
  if (error) throw error;
}

// Archivo adjunto como Blob (para verlo o descargarlo)
export async function downloadExpenseFile(path) {
  const { data, error } = await getSupabase().storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}
