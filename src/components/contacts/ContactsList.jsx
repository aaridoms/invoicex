"use client";

import { formatEuro } from "@/app/helpers/invoiceMath";
import { searchContacts } from "@/lib/contacts";
import {
  clientInvoiceStats,
  createContact,
  deleteContact,
  importClientsFromInvoices,
  listContacts,
  updateContact,
} from "@/lib/data/contacts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconPlus, IconSearch, IconUsers } from "../icons";
import { canWrite, useSession } from "../SessionProvider";
import { Button, Input, PageHeader, Toast } from "../ui";
import ContactPanel from "./ContactPanel";

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "client", label: "Clientes" },
  { value: "supplier", label: "Proveedores" },
];

function Badge({ children }) {
  return (
    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
      {children}
    </span>
  );
}

export default function ContactsList() {
  const { org, role } = useSession();
  const writable = canWrite(role);
  const [contacts, setContacts] = useState(null);
  const [stats, setStats] = useState(new Map());
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState(null); // null | { contact } (contact null = nuevo)
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([
        listContacts(org.id),
        clientInvoiceStats(org.id),
      ]);
      setContacts(list);
      setStats(s);
    } catch (err) {
      console.error("Contactos:", err);
      setContacts([]);
      notify("No se pudieron cargar los contactos", "error");
    }
  }, [org.id, notify]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    const list = contacts || [];
    return {
      all: list.length,
      client: list.filter((c) => c.isClient).length,
      supplier: list.filter((c) => c.isSupplier).length,
    };
  }, [contacts]);

  const visible = useMemo(
    () =>
      searchContacts(contacts || [], query, {
        kind: filter,
        limit: Number.POSITIVE_INFINITY,
      }),
    [contacts, query, filter]
  );

  const handleSave = async (form) => {
    setBusy(true);
    try {
      const saved = panel.contact?.id
        ? await updateContact(panel.contact.id, form)
        : await createContact(org.id, form);
      await refresh();
      setPanel(null);
      notify(panel.contact?.id ? "Contacto guardado" : `${saved.name} añadido`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    const c = panel.contact;
    if (
      !window.confirm(
        `¿Eliminar a ${c.name}? Sus facturas se conservan, solo pierden el enlace a la ficha.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await deleteContact(c.id);
      await refresh();
      setPanel(null);
      notify("Contacto eliminado");
    } catch (err) {
      notify(err?.message || "No se pudo eliminar", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const { created, linked } = await importClientsFromInvoices(org.id, contacts || []);
      await refresh();
      notify(
        linked === 0
          ? "No hay facturas sin cliente enlazado."
          : `${created} ${created === 1 ? "cliente nuevo" : "clientes nuevos"} · ${linked} ${
              linked === 1 ? "factura enlazada" : "facturas enlazadas"
            }`
      );
    } catch (err) {
      console.error("Importar clientes:", err);
      notify(err?.message || "No se pudieron importar los clientes", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Clientes y proveedores"
        description="Fichas para rellenar las facturas en un clic."
        actions={
          writable ? (
            <>
              <Button
                onClick={handleImport}
                disabled={importing || contacts === null}
                title="Crea fichas con los clientes de tus facturas emitidas"
              >
                {importing ? "Importando…" : "Importar desde facturas"}
              </Button>
              <Button variant="primary" onClick={() => setPanel({ contact: null })}>
                <IconPlus className="h-4 w-4" />
                Nuevo contacto
              </Button>
            </>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <div className="flex gap-1" role="tablist" aria-label="Tipo de contacto">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  filter === f.value
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-xs text-muted tabular">{counts[f.value]}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              aria-label="Buscar contactos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o NIF"
              className="pl-9"
            />
          </div>
        </div>

        {contacts === null ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Cargando…</p>
        ) : contacts.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <IconUsers className="mx-auto h-8 w-8 text-muted/60" />
            <p className="mt-3 text-sm text-fg">Aún no tienes contactos</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Créalos a mano o pulsa «Importar desde facturas» para generar las
              fichas de los clientes a los que ya has facturado.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No hay contactos que coincidan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Nombre</th>
                <th className="px-5 py-2.5 font-medium">NIF/CIF</th>
                <th className="px-5 py-2.5 font-medium">Ciudad</th>
                <th className="px-5 py-2.5 font-medium">Contacto</th>
                <th className="px-5 py-2.5 text-right font-medium">Facturas</th>
                <th className="px-5 py-2.5 text-right font-medium">Facturado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const s = stats.get(c.id);
                return (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    onClick={() => setPanel({ contact: c })}
                    onKeyDown={(e) => e.key === "Enter" && setPanel({ contact: c })}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-2/50 focus-visible:bg-surface-2/50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="max-w-[260px] truncate font-medium">{c.name}</span>
                        {c.isClient && c.isSupplier ? (
                          <Badge>Cliente y proveedor</Badge>
                        ) : c.isSupplier ? (
                          <Badge>Proveedor</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted tabular">{c.taxId || "—"}</td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-muted">{c.city || "—"}</td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-muted">
                      {c.email || c.phone || "—"}
                    </td>
                    <td className="px-5 py-3 text-right tabular">{s?.count ?? 0}</td>
                    <td className="px-5 py-3 text-right font-medium tabular">
                      {s ? formatEuro(s.total) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {panel ? (
        <ContactPanel
          key={panel.contact?.id || "nuevo"}
          contact={panel.contact}
          stats={panel.contact ? stats.get(panel.contact.id) : null}
          writable={writable}
          busy={busy}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setPanel(null)}
          formatEuro={formatEuro}
        />
      ) : null}

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
