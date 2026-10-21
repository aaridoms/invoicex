"use client";

import { formatEuro } from "@/app/helpers/invoiceMath";
import { clientKey, normalizeTaxId } from "@/lib/contacts";
import { createContact, listContacts, updateContact } from "@/lib/data/contacts";
import { deleteExpense, downloadExpenseFile, saveExpense } from "@/lib/data/expenses";
import { EXPENSE_CATEGORIES, computeExpense } from "@/lib/expenses";
import { extractInvoiceData } from "@/lib/extract/invoiceText";
import { extractPdfText } from "@/lib/pdfjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ClientField from "../invoice/ClientField";
import { IconDownload, IconPlus, IconTrash, IconUpload } from "../icons";
import PdfPreview from "../PdfPreview";
import { canWrite, useSession } from "../SessionProvider";
import { Button, Card, Field, Input, PageHeader, Select, Textarea, Toast } from "../ui";

const RATES = [21, 10, 5, 4, 0];
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const MAX_BYTES = 15 * 1024 * 1024;

const todayISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const fmt2 = (n) => Number(n || 0).toFixed(2).replace(".", ",");

// manual: la cuota la ha escrito el usuario (no se recalcula sola)
const blankLine = (rate = 10) => ({ rate, base: "", cuota: "", manual: false });
const filledLine = (l) => ({ rate: l.rate, base: fmt2(l.base), cuota: fmt2(l.cuota), manual: false });

const EMPTY = {
  supplierId: null,
  supplier: { nombre: "", cif: "" },
  number: "",
  issueDate: "",
  category: "compras",
  vatLines: [blankLine()],
  retention: "",
  notes: "",
};

// Formulario de un gasto con su documento al lado. Al subir un PDF con
// texto se propone el rellenado automático (campos marcados "Detectado").
export default function ExpenseForm({ expense = null }) {
  const router = useRouter();
  const { org, role, issuers } = useSession();
  const writable = canWrite(role);
  const isNew = !expense;

  const [form, setForm] = useState(() =>
    expense
      ? {
          ...EMPTY,
          ...expense,
          vatLines: expense.vatLines.length ? expense.vatLines.map(filledLine) : [blankLine()],
          retention: expense.retention ? fmt2(expense.retention) : "",
        }
      : EMPTY
  );
  const [contacts, setContacts] = useState([]);
  const [saveSupplier, setSaveSupplier] = useState(true);
  const [detected, setDetected] = useState(new Set());
  const [printedTotal, setPrintedTotal] = useState(null);
  const [file, setFile] = useState(null); // File nuevo (aún sin subir)
  const [doc, setDoc] = useState(null); // { kind: "pdf", data } | { kind: "image", url }
  const [docStatus, setDocStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInput = useRef(null);
  const toastTimer = useRef(null);

  const notify = (message, type = "success", ms = 5000) => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  // Fecha de hoy solo en el navegador (evita diferencias con el servidor)
  useEffect(() => {
    if (isNew) setForm((f) => (f.issueDate ? f : { ...f, issueDate: todayISO() }));
  }, [isNew]);

  useEffect(() => {
    listContacts(org.id)
      .then(setContacts)
      .catch((err) => console.error("Contactos:", err));
  }, [org.id]);

  // Documento ya guardado de un gasto existente
  useEffect(() => {
    if (!expense?.filePath) return;
    let url = null;
    downloadExpenseFile(expense.filePath)
      .then(async (blob) => {
        if (blob.type === "application/pdf") {
          setDoc({ kind: "pdf", data: await blob.arrayBuffer() });
        } else {
          url = URL.createObjectURL(blob);
          setDoc({ kind: "image", url });
        }
      })
      .catch(() => setDocStatus("No se pudo cargar el documento guardado."));
    return () => url && URL.revokeObjectURL(url);
  }, [expense?.filePath]);

  const calc = useMemo(
    () => computeExpense(form.vatLines, form.retention),
    [form.vatLines, form.retention]
  );
  const totalMismatch =
    printedTotal !== null && Math.abs(printedTotal - calc.total) > 0.02;

  // ----- edición de campos -----

  const undetect = (key) =>
    setDetected((d) => {
      if (!d.has(key)) return d;
      const next = new Set(d);
      next.delete(key);
      return next;
    });

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    undetect(key);
  };

  const updateLine = (i, patch) => {
    setForm((f) => ({
      ...f,
      vatLines: f.vatLines.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, ...patch };
        // La cuota se recalcula sola salvo que se haya escrito a mano
        if (("base" in patch || "rate" in patch) && !l.manual) next.cuota = "";
        if ("cuota" in patch) next.manual = patch.cuota !== "";
        return next;
      }),
    }));
    undetect("amounts");
  };

  // ----- documento y extracción -----

  const applyExtraction = (data) => {
    const found = new Set();
    const next = {};
    const contact = data.supplierTaxId
      ? contacts.find((c) => normalizeTaxId(c.taxId) === data.supplierTaxId)
      : null;
    if (contact) {
      next.supplierId = contact.id;
      next.supplier = { nombre: contact.name, cif: contact.taxId };
      found.add("supplier");
    } else if (data.supplierTaxId || data.supplierName) {
      next.supplier = { nombre: data.supplierName, cif: data.supplierTaxId };
      if (data.supplierTaxId) found.add("supplier");
    }
    if (data.number) {
      next.number = data.number;
      found.add("number");
    }
    if (data.date) {
      next.issueDate = data.date;
      found.add("issueDate");
    }
    if (data.vatLines.length) {
      next.vatLines = data.vatLines.map(filledLine);
      next.retention = data.retention ? fmt2(data.retention) : "";
      found.add("amounts");
    }
    setPrintedTotal(data.total);
    setForm((f) => ({ ...f, ...next }));
    setDetected(found);
    return found.size;
  };

  const handleFile = async (picked) => {
    if (!picked) return;
    if (!ACCEPT.split(",").includes(picked.type)) {
      notify("Formato no admitido. Usa PDF, JPG, PNG o WebP.", "error");
      return;
    }
    if (picked.size > MAX_BYTES) {
      notify("El archivo es demasiado grande (máximo 15 MB).", "error");
      return;
    }
    setFile(picked);
    setPrintedTotal(null);

    if (picked.type !== "application/pdf") {
      setDoc({ kind: "image", url: URL.createObjectURL(picked) });
      setDocStatus("Las fotos se rellenan a mano: revisa la imagen y completa los datos.");
      return;
    }

    const data = await picked.arrayBuffer();
    setDoc({ kind: "pdf", data });
    setDocStatus("Leyendo el PDF…");
    try {
      const text = await extractPdfText(data);
      if (text.replace(/\s/g, "").length < 30) {
        setDocStatus("Este PDF no lleva texto (parece escaneado): rellena los datos a mano.");
        return;
      }
      const result = extractInvoiceData(text, {
        ownTaxIds: issuers.map((i) => i.cif).filter(Boolean),
      });
      const n = applyExtraction(result);
      setDocStatus(
        n
          ? result.confidence.amounts === "low"
            ? "Datos propuestos a partir del PDF. Los importes no cuadran del todo: revísalos."
            : "Datos propuestos a partir del PDF. Revisa los campos marcados antes de guardar."
          : "No se han reconocido datos en este PDF: rellénalos a mano."
      );
    } catch (err) {
      console.error("Leer PDF:", err);
      setDocStatus("No se pudo leer el PDF: rellena los datos a mano.");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  // ----- guardar y borrar -----

  // Proveedor al que enlazar el gasto: el elegido, uno existente con el
  // mismo NIF/nombre (marcándolo como proveedor si solo era cliente) o uno
  // nuevo si se pidió guardarlo
  const resolveSupplierId = async () => {
    if (form.supplierId) return form.supplierId;
    if (!saveSupplier || !form.supplier.nombre.trim()) return null;
    const draft = { name: form.supplier.nombre, taxId: form.supplier.cif };
    const existing = contacts.find((c) => clientKey(c) === clientKey(draft));
    try {
      if (existing) {
        if (!existing.isSupplier) await updateContact(existing.id, { ...existing, isSupplier: true });
        return existing.id;
      }
      const created = await createContact(org.id, { ...draft, isClient: false, isSupplier: true });
      return created.id;
    } catch (err) {
      console.error("Guardar proveedor:", err);
      return null;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!form.supplier.nombre.trim()) missing.push("proveedor");
    if (!form.issueDate) missing.push("fecha");
    if (calc.lines.length === 0) missing.push("importes");
    if (missing.length) {
      notify(`Falta: ${missing.join(", ")}.`, "warning");
      return;
    }
    setBusy(true);
    try {
      const supplierId = await resolveSupplierId();
      const saved = await saveExpense({
        orgId: org.id,
        id: expense?.id,
        form: { ...form, supplierId },
        file,
      });
      if (isNew) {
        router.push("/expenses");
        router.refresh();
        return;
      }
      setFile(null);
      setForm((f) => ({ ...f, supplierId: saved.supplierId }));
      notify("Gasto guardado");
      router.refresh();
    } catch (err) {
      console.error("Guardar gasto:", err);
      notify(err?.message || "No se pudo guardar el gasto", "error", 7000);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este gasto y su documento? No se puede deshacer.")) return;
    setBusy(true);
    try {
      await deleteExpense(expense);
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      notify(err?.message || "No se pudo eliminar", "error");
      setBusy(false);
    }
  };

  const downloadDoc = async () => {
    const blob = file || (await downloadExpenseFile(expense.filePath));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file?.name || expense?.fileName || "factura";
    a.click();
    URL.revokeObjectURL(url);
  };

  const Detected = ({ k }) =>
    detected.has(k) ? (
      <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
        Detectado
      </span>
    ) : null;

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-7">
      <PageHeader
        title={isNew ? "Nuevo gasto" : "Gasto"}
        description={
          isNew
            ? "Sube la factura del proveedor y revisa los datos."
            : `${form.supplier.nombre || "Proveedor"}${form.number ? ` · ${form.number}` : ""}`
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/expenses")}>
              Volver
            </Button>
            {writable ? (
              <Button variant="primary" type="submit" form="expense-form" disabled={busy}>
                {busy ? "Guardando…" : "Guardar gasto"}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-6 min-[1280px]:grid-cols-2">
        {/* Documento */}
        <section className="min-[1280px]:sticky min-[1280px]:top-7">
          {doc ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 px-1 text-xs text-muted">
                <span className="truncate">{file?.name || expense?.fileName}</span>
                <span className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="sm" onClick={downloadDoc}>
                    <IconDownload className="h-3.5 w-3.5" />
                    Descargar
                  </Button>
                  {writable ? (
                    <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
                      Cambiar
                    </Button>
                  ) : null}
                </span>
              </div>
              {doc.kind === "pdf" ? (
                <PdfPreview data={doc.data} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.url}
                  alt="Factura del proveedor"
                  className="max-h-[80vh] w-full rounded-lg bg-white object-contain"
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={!writable}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex aspect-[210/297] max-h-[75vh] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 text-center transition-colors ${
                dragging ? "border-accent bg-accent/5" : "border-border hover:border-muted/50"
              }`}
            >
              <IconUpload className="h-8 w-8 text-muted" />
              <p className="mt-3 text-sm font-medium">Arrastra aquí la factura</p>
              <p className="mt-1 text-xs text-muted">
                o haz clic para elegirla · PDF, JPG o PNG hasta 15 MB
              </p>
              <p className="mt-4 max-w-xs text-xs text-muted/80">
                Si el PDF lleva texto, los datos se proponen solos. Nada sale de
                tu navegador hasta que guardas.
              </p>
            </button>
          )}
          {docStatus ? (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted" role="status">
              {docStatus}
            </p>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </section>

        {/* Formulario */}
        <form id="expense-form" onSubmit={handleSave} className="space-y-5">
          <fieldset disabled={!writable || busy} className="space-y-5">
            <Card
              title="Proveedor"
              actions={
                form.supplierId ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-accent">Proveedor guardado</span>
                    <button
                      type="button"
                      onClick={() => set("supplierId", null)}
                      className="text-muted hover:text-fg"
                    >
                      Desvincular
                    </button>
                  </span>
                ) : form.supplier.nombre.trim() ? (
                  <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={saveSupplier}
                      onChange={(e) => setSaveSupplier(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[rgb(var(--accent))]"
                    />
                    Guardar en mis proveedores
                  </label>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <Field label={<>Nombre o razón social<Detected k="supplier" /></>} htmlFor="supplierName">
                  <ClientField
                    id="supplierName"
                    kind="supplier"
                    placeholder="Distribuciones Ejemplo S.L."
                    value={form.supplier.nombre}
                    contacts={contacts}
                    linked={!!form.supplierId}
                    onType={(nombre) => {
                      setForm((f) => ({ ...f, supplierId: null, supplier: { ...f.supplier, nombre } }));
                      undetect("supplier");
                    }}
                    onSelect={(c) => {
                      setForm((f) => ({
                        ...f,
                        supplierId: c.id,
                        supplier: { nombre: c.name, cif: c.taxId },
                      }));
                      undetect("supplier");
                    }}
                  />
                </Field>
                <Field label="NIF/CIF" htmlFor="supplierCif">
                  <Input
                    id="supplierCif"
                    value={form.supplier.cif}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, supplier: { ...f.supplier, cif: e.target.value } }))
                    }
                    placeholder="B12345678"
                  />
                </Field>
              </div>
            </Card>

            <Card title="Factura">
              <div className="grid grid-cols-3 gap-3">
                <Field label={<>Nº de factura<Detected k="number" /></>} htmlFor="expNumber">
                  <Input
                    id="expNumber"
                    value={form.number}
                    onChange={(e) => set("number", e.target.value)}
                    className="tabular"
                  />
                </Field>
                <Field label={<>Fecha<Detected k="issueDate" /></>} htmlFor="expDate">
                  <Input
                    id="expDate"
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => set("issueDate", e.target.value)}
                  />
                </Field>
                <Field label="Categoría" htmlFor="expCategory">
                  <Select
                    id="expCategory"
                    value={form.category}
                    onChange={(e) => set("category", e.target.value)}
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </Card>

            <Card
              title={<>Importes<Detected k="amounts" /></>}
              description="Una línea por cada tipo de IVA de la factura."
            >
              <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_28px] gap-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                <span className="text-right">Base imponible</span>
                <span>IVA</span>
                <span className="text-right">Cuota</span>
                <span />
              </div>
              <div className="space-y-2">
                {form.vatLines.map((l, i) => {
                  const auto = fmt2(((Number(String(l.base).replace(",", ".")) || 0) * l.rate) / 100);
                  return (
                    <div
                      key={i}
                      className="group grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_28px] items-center gap-2"
                    >
                      <Input
                        aria-label="Base imponible"
                        inputMode="decimal"
                        value={l.base}
                        onChange={(e) => updateLine(i, { base: e.target.value })}
                        placeholder="0,00"
                        className="text-right tabular"
                      />
                      <Select
                        aria-label="Tipo de IVA"
                        value={l.rate}
                        onChange={(e) => updateLine(i, { rate: Number(e.target.value) })}
                        className="!px-2 tabular"
                      >
                        {RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </Select>
                      <Input
                        aria-label="Cuota de IVA"
                        inputMode="decimal"
                        value={l.cuota}
                        placeholder={auto}
                        onChange={(e) => updateLine(i, { cuota: e.target.value })}
                        className="text-right tabular"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Quitar línea"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            vatLines:
                              f.vatLines.length === 1
                                ? [blankLine()]
                                : f.vatLines.filter((_, j) => j !== i),
                          }))
                        }
                        className="opacity-40 group-hover:opacity-100 hover:!text-danger"
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-start justify-between gap-6">
                <Button
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, vatLines: [...f.vatLines, blankLine(21)] }))}
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Otro tipo de IVA
                </Button>
                <div className="w-64 space-y-2">
                  <Field label="Retención IRPF (si la hay)" htmlFor="expRetention">
                    <Input
                      id="expRetention"
                      inputMode="decimal"
                      value={form.retention}
                      onChange={(e) => set("retention", e.target.value)}
                      placeholder="0,00"
                      className="text-right tabular"
                    />
                  </Field>
                  <dl className="space-y-1.5 pt-1 text-sm tabular">
                    <div className="flex justify-between text-muted">
                      <dt>Base imponible</dt>
                      <dd>{formatEuro(calc.base)}</dd>
                    </div>
                    <div className="flex justify-between text-muted">
                      <dt>IVA soportado</dt>
                      <dd>{formatEuro(calc.vat)}</dd>
                    </div>
                    {calc.retention ? (
                      <div className="flex justify-between text-muted">
                        <dt>Retención</dt>
                        <dd>−{formatEuro(calc.retention)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <dt>Total</dt>
                      <dd>{formatEuro(calc.total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {totalMismatch ? (
                <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  El total impreso en la factura es {formatEuro(printedTotal)} y el calculado es{" "}
                  {formatEuro(calc.total)}. Revisa las bases, los tipos y la retención.
                </p>
              ) : null}
            </Card>

            <Card title="Notas">
              <Textarea
                aria-label="Notas"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Opcional: albarán, forma de pago…"
              />
            </Card>
          </fieldset>

          {!isNew && writable ? (
            <div className="flex justify-start border-t border-border pt-5">
              <Button variant="danger" onClick={handleDelete} disabled={busy}>
                <IconTrash />
                Eliminar gasto
              </Button>
            </div>
          ) : null}
        </form>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
