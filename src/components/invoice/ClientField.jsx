"use client";

import { searchContacts } from "@/lib/contacts";
import { useId, useState } from "react";
import { Input } from "../ui";

// Campo "Nombre o razón social" con autocompletado de clientes guardados.
// Patrón combobox de ARIA: flechas para moverse, Enter para elegir y
// Escape para cerrar. Escribir un nombre distinto suelta la ficha enlazada.
// kind: "client" (facturas emitidas) o "supplier" (gastos)
export default function ClientField({
  id,
  value,
  contacts,
  linked,
  onType,
  onSelect,
  kind = "client",
  placeholder = "Empresa S.L.",
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const suggestions =
    open && value.trim() && !linked
      ? searchContacts(contacts, value, { kind, limit: 6 })
      : [];
  const showList = suggestions.length > 0;

  const choose = (contact) => {
    onSelect(contact);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      // Que el Enter del formulario (añadir línea, Ctrl+Enter) no actúe aquí
      e.preventDefault();
      e.stopPropagation();
      choose(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-surface-2 py-1 shadow-xl shadow-black/30"
        >
          {suggestions.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown (no click): se dispara antes del blur del input
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 text-sm ${
                i === active ? "bg-border/60" : ""
              }`}
            >
              <span className="truncate">{c.name}</span>
              <span className="shrink-0 text-xs text-muted tabular">
                {c.taxId || c.city}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
