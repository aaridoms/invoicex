"use client";

import { formatEuro } from "@/app/helpers/invoiceMath";
import {
  DUPLICATE_KEY,
  deleteInvoice,
  downloadInvoice,
  exportAllInvoices,
  getInvoice,
  importInvoices,
  listInvoices,
} from "@/app/helpers/invoicesStore";
import {
  exportSettingsState,
  importProfiles,
} from "@/app/helpers/settingsStore";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  IconDownload,
  IconFile,
  IconSearch,
  IconTrash,
  IconUpload,
} from "./icons";
import { Button, Input, PageHeader, Toast } from "./ui";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// "dd/mm/aaaa" (o la fecha de creación) -> { year, month }
const invoiceMonth = (it) => {
  const [d, m, y] = String(it.meta?.fecha || "").split("/");
  if (y && m && d) return { year: Number(y), month: Number(m) };
  const date = new Date(it.createdAt);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function InvoicesList() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await listInvoices());
    } catch (e) {
      notify("No se pudo cargar el historial de facturas", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const includes = (val) =>
      String(val || "")
        .toLowerCase()
        .includes(q);
    return items.filter(
      (it) =>
        includes(it.meta?.nFactura) ||
        includes(it.meta?.cliente) ||
        includes(it.meta?.fecha) ||
        includes(it.filename)
    );
  }, [items, query]);

  const stats = useMemo(() => {
    const now = new Date();
    const sum = (list) => list.reduce((s, it) => s + (it.meta?.total || 0), 0);
    const thisMonth = items.filter((it) => {
      const { year, month } = invoiceMonth(it);
      return year === now.getFullYear() && month === now.getMonth() + 1;
    });
    const thisYear = items.filter(
      (it) => invoiceMonth(it).year === now.getFullYear()
    );
    return {
      monthTotal: sum(thisMonth),
      monthCount: thisMonth.length,
      yearTotal: sum(thisYear),
      yearCount: thisYear.length,
      year: now.getFullYear(),
      monthName: now.toLocaleDateString("es-ES", { month: "long" }),
    };
  }, [items]);

  const handleDownload = async (id) => {
    try {
      const rec = await downloadInvoice(id);
      if (rec?.blob) saveBlob(rec.blob, rec.filename || `factura_${id}.pdf`);
    } catch (e) {
      notify("No se pudo descargar la factura", "error");
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const rec = await getInvoice(id);
      if (!rec?.meta?.invoice) return;
      sessionStorage.setItem(
        DUPLICATE_KEY,
        JSON.stringify({ from: id, invoice: rec.meta.invoice })
      );
      router.push("/");
    } catch (e) {
      notify("No se pudo duplicar la factura", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`¿Eliminar la factura ${id}? No se puede deshacer.`)) {
      return;
    }
    try {
      await deleteInvoice(id);
      await refresh();
      notify(`Factura ${id} eliminada`);
    } catch (e) {
      notify("No se pudo eliminar la factura", "error");
    }
  };

  const handleExport = async () => {
    try {
      const backup = {
        app: "invoicex",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: exportSettingsState(),
        invoices: await exportAllInvoices(),
      };
      saveBlob(
        new Blob([JSON.stringify(backup)], { type: "application/json" }),
        `invoicex-copia-${new Date().toISOString().slice(0, 10)}.json`
      );
      notify(
        `Copia exportada con ${plural(backup.invoices.length, "factura", "facturas")}.`
      );
    } catch (e) {
      notify("No se pudo exportar la copia de seguridad", "error");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (backup?.app !== "invoicex" || !Array.isArray(backup.invoices)) {
        throw new Error("formato");
      }
      const profilesAdded = importProfiles(backup.settings);
      const { added, skipped } = await importInvoices(backup.invoices);
      await refresh();
      notify(
        `Importadas: ${plural(added, "factura", "facturas")}` +
          (skipped ? ` (${skipped} ya existían y se han omitido)` : "") +
          (profilesAdded
            ? ` y ${plural(profilesAdded, "compañía", "compañías")}.`
            : ".")
      );
    } catch (err) {
      notify(
        "El archivo no es una copia válida de InvoiceX o no se pudo importar",
        "error"
      );
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Historial"
        description="Facturas guardadas en este navegador. Exporta una copia de vez en cuando para no perderlas."
        actions={
          <>
            <Button onClick={() => fileInputRef.current?.click()}>
              <IconUpload />
              Importar copia
            </Button>
            <Button onClick={handleExport}>
              <IconDownload />
              Exportar copia
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat
          label={`Facturado en ${stats.monthName}`}
          value={formatEuro(stats.monthTotal)}
          hint={plural(stats.monthCount, "factura", "facturas")}
        />
        <Stat
          label={`Facturado en ${stats.year}`}
          value={formatEuro(stats.yearTotal)}
          hint={plural(stats.yearCount, "factura", "facturas")}
        />
        <Stat
          label="Total en el historial"
          value={items.length}
          hint="facturas guardadas"
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border p-3">
          <div className="relative max-w-md">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              aria-label="Buscar en el historial"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número, cliente o fecha"
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <IconFile className="mx-auto h-8 w-8 text-muted/60" />
            <p className="mt-3 text-sm text-fg">Aún no hay facturas</p>
            <p className="mt-1 text-xs text-muted">
              Las facturas que generes aparecerán aquí.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No hay resultados para “{query}”.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Número</th>
                <th className="px-5 py-2.5 font-medium">Fecha</th>
                <th className="px-5 py-2.5 font-medium">Cliente</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((it) => (
                <tr
                  key={it.id}
                  className="group border-b border-border/60 last:border-0 hover:bg-surface-2/50"
                >
                  <td className="px-5 py-3 font-medium tabular">
                    {it.meta?.nFactura || it.id}
                  </td>
                  <td className="px-5 py-3 text-muted tabular">
                    {it.meta?.fecha || "—"}
                  </td>
                  <td className="max-w-[280px] truncate px-5 py-3">
                    {it.meta?.cliente || "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular">
                    {it.meta?.total != null ? formatEuro(it.meta.total) : "—"}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      {it.meta?.invoice ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(it.id)}
                          title="Crear una factura nueva con estos datos"
                        >
                          Duplicar
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(it.id)}
                      >
                        <IconDownload className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(it.id)}
                        aria-label={`Eliminar factura ${it.id}`}
                        className="hover:!text-danger"
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
