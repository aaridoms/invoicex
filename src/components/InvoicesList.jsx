"use client";

import {
  deleteInvoice,
  downloadInvoice,
  listInvoices,
} from "@/app/helpers/invoicesStore";
import { useEffect, useMemo, useState } from "react";

export default function InvoicesList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listInvoices();
      setItems(data);
    } catch (e) {
      setError("No se pudo cargar el historial de facturas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

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

  const handleDownload = async (id) => {
    try {
      const rec = await downloadInvoice(id);
      if (!rec) return;
      const { blob, filename } = rec;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("No se pudo descargar la factura");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInvoice(id);
      await refresh();
    } catch (e) {
      setError("No se pudo eliminar la factura");
    }
  };

  return (
    <section className="mt-10 max-w-3xl mx-auto">
      <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Historial de facturas
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Facturas guardadas localmente en tu navegador.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          {/* Buscador */}
          <div className="mb-4">
            <label htmlFor="invoice-search" className="sr-only">
              Buscar en historial
            </label>
            <input
              id="invoice-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número, cliente, fecha o nombre de archivo"
              className="block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
            />
          </div>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aún no hay facturas guardadas.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No hay resultados para “{query}”.
            </p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-zinc-800">
              {filteredItems.map((it) => (
                <li
                  key={it.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {it.meta?.nFactura
                        ? `Factura ${it.meta.nFactura}`
                        : it.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {it.meta?.cliente ? `${it.meta.cliente} • ` : null}
                      {it.meta?.fecha ? `${it.meta.fecha} • ` : null}
                      {it.meta?.total != null
                        ? new Intl.NumberFormat("es-ES", {
                            style: "currency",
                            currency: "EUR",
                          }).format(it.meta.total)
                        : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(it.id)}
                      className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Descargar
                    </button>
                    <button
                      onClick={() => handleDelete(it.id)}
                      className="inline-flex items-center rounded-lg bg-transparent border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {error ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
