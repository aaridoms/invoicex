"use client";

import { formatDate, formatEuro } from "@/app/helpers/invoiceMath";
import {
  deleteInvoice,
  downloadInvoicePdf,
  listInvoices,
} from "@/lib/data/invoices";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconDownload, IconFile, IconPlus, IconSearch, IconTrash } from "./icons";
import { canWrite, useSession } from "./SessionProvider";
import { Button, ButtonLink, Input, PageHeader, Toast } from "./ui";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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
  // Los emisores llegan ya cargados desde el layout (sin consulta extra)
  const { org, role, issuers } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await listInvoices(org.id));
    } catch (e) {
      console.error("Historial:", e);
      notify("No se pudo cargar el historial de facturas", "error");
    } finally {
      setLoading(false);
    }
  }, [org.id, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const issuerName = useMemo(() => {
    const names = new Map(issuers.map((i) => [i.id, i.companyName || i.brandTitle]));
    return (id) => names.get(id) || "—";
  }, [issuers]);
  const showIssuer = issuers.length > 1;

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const includes = (val) =>
      String(val || "")
        .toLowerCase()
        .includes(q);
    return items.filter(
      (it) =>
        includes(it.number) ||
        includes(it.client?.nombre) ||
        includes(formatDate(it.issue_date)) ||
        includes(issuerName(it.issuer_id))
    );
  }, [items, query, issuerName]);

  const stats = useMemo(() => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const sum = (list) => list.reduce((s, it) => s + Number(it.total || 0), 0);
    const thisMonth = items.filter((it) => it.issue_date.startsWith(month));
    const thisYear = items.filter((it) => it.issue_date.startsWith(year));
    return {
      monthTotal: sum(thisMonth),
      monthCount: thisMonth.length,
      yearTotal: sum(thisYear),
      yearCount: thisYear.length,
      year,
      monthName: now.toLocaleDateString("es-ES", { month: "long" }),
    };
  }, [items]);

  const handleDownload = async (id) => {
    try {
      const { blob, filename } = await downloadInvoicePdf(id, issuers);
      saveBlob(blob, filename);
    } catch (e) {
      console.error("Descarga:", e);
      notify("No se pudo descargar la factura", "error");
    }
  };

  const handleDelete = async (it) => {
    if (
      !window.confirm(`¿Eliminar la factura ${it.number}? No se puede deshacer.`)
    ) {
      return;
    }
    try {
      await deleteInvoice(it.id);
      await refresh();
      notify(`Factura ${it.number} eliminada`);
    } catch (e) {
      console.error("Eliminar:", e);
      notify("No se pudo eliminar la factura", "error");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Facturas"
        description={`Facturas emitidas por ${org.name}.`}
        actions={
          canWrite(role) ? (
            <ButtonLink href="/invoices/new" variant="primary">
              <IconPlus className="h-4 w-4" />
              Nueva factura
            </ButtonLink>
          ) : null
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
          hint="facturas emitidas"
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
                {showIssuer ? (
                  <th className="px-5 py-2.5 font-medium">Empresa</th>
                ) : null}
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
                  <td className="px-5 py-3 font-medium tabular">{it.number}</td>
                  <td className="px-5 py-3 text-muted tabular">
                    {formatDate(it.issue_date)}
                  </td>
                  <td className="max-w-[260px] truncate px-5 py-3">
                    {it.client?.nombre || "—"}
                  </td>
                  {showIssuer ? (
                    <td className="max-w-[200px] truncate px-5 py-3 text-muted">
                      {issuerName(it.issuer_id)}
                    </td>
                  ) : null}
                  <td className="px-5 py-3 text-right font-medium tabular">
                    {formatEuro(it.total)}
                  </td>
                  <td className="px-5 py-2">
                    <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                      {canWrite(role) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/invoices/new?duplicar=${it.id}`)
                          }
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
                      {role === "owner" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(it)}
                          aria-label={`Eliminar factura ${it.number}`}
                          className="hover:!text-danger"
                        >
                          <IconTrash />
                        </Button>
                      ) : null}
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
