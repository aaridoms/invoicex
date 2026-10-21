"use client";

import { useEffect, useState } from "react";
import { IconTrash } from "../icons";
import { Button, Field, Input, Textarea } from "../ui";

export const EMPTY_CONTACT = {
  name: "",
  taxId: "",
  address: "",
  city: "",
  email: "",
  phone: "",
  notes: "",
  isClient: true,
  isSupplier: false,
};

// Panel lateral para crear o editar un contacto sin salir del listado
export default function ContactPanel({
  contact, // null = nuevo
  stats, // { count, total } del cliente, opcional
  writable,
  busy,
  onSave,
  onDelete,
  onClose,
  formatEuro,
}) {
  const [form, setForm] = useState(() => ({ ...EMPTY_CONTACT, ...contact }));
  const [error, setError] = useState("");
  const isNew = !contact?.id;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (field) => (e) =>
    setForm((f) => ({
      ...f,
      [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!form.isClient && !form.isSupplier) {
      setError("Marca si es cliente, proveedor o ambos.");
      return;
    }
    setError("");
    onSave(form).catch((err) => setError(err?.message || "No se pudo guardar"));
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? "Nuevo contacto" : form.name}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <form
        onSubmit={handleSubmit}
        className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">
            {isNew ? "Nuevo contacto" : form.name || "Contacto"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </header>

        <fieldset
          disabled={!writable || busy}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
        >
          {stats ? (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-2 px-4 py-3 text-sm">
              <div>
                <p className="text-xs text-muted">Facturas emitidas</p>
                <p className="font-semibold tabular">{stats.count}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Total facturado</p>
                <p className="font-semibold tabular">{formatEuro(stats.total)}</p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-5 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.isClient}
                onChange={update("isClient")}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              Cliente
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.isSupplier}
                onChange={update("isSupplier")}
                className="h-4 w-4 accent-[rgb(var(--accent))]"
              />
              Proveedor
            </label>
          </div>

          <Field label="Nombre o razón social" htmlFor="contactName">
            <Input
              id="contactName"
              autoFocus
              value={form.name}
              onChange={update("name")}
            />
          </Field>
          <Field label="NIF/CIF" htmlFor="contactTaxId">
            <Input
              id="contactTaxId"
              value={form.taxId}
              onChange={update("taxId")}
              placeholder="B12345678"
            />
          </Field>
          <Field label="Dirección" htmlFor="contactAddress">
            <Input id="contactAddress" value={form.address} onChange={update("address")} />
          </Field>
          <Field label="Código postal y ciudad" htmlFor="contactCity">
            <Input
              id="contactCity"
              value={form.city}
              onChange={update("city")}
              placeholder="41010 Sevilla"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" htmlFor="contactEmail">
              <Input id="contactEmail" type="email" value={form.email} onChange={update("email")} />
            </Field>
            <Field label="Teléfono" htmlFor="contactPhone">
              <Input id="contactPhone" type="tel" value={form.phone} onChange={update("phone")} />
            </Field>
          </div>
          <Field label="Notas internas" htmlFor="contactNotes" hint="No aparecen en las facturas.">
            <Textarea id="contactNotes" value={form.notes} onChange={update("notes")} />
          </Field>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </fieldset>

        {writable ? (
          <footer className="flex items-center justify-between border-t border-border px-5 py-4">
            {!isNew ? (
              <Button variant="danger" size="sm" onClick={onDelete} disabled={busy}>
                <IconTrash className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "Guardando…" : isNew ? "Crear contacto" : "Guardar cambios"}
            </Button>
          </footer>
        ) : null}
      </form>
    </div>
  );
}
