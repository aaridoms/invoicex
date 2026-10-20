"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pestañas de Configuración. Cada una es una ruta propia, así que añadir
// una nueva (p. ej. Usuarios) es crear su página y una línea aquí.
const TABS = [
  { href: "/settings", label: "Empresas" },
  { href: "/settings/billing", label: "Facturación" },
  { href: "/settings/preferences", label: "Preferencias" },
  { href: "/settings/account", label: "Cuenta" },
  { href: "/settings/data", label: "Datos" },
];

export default function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-border" aria-label="Secciones de configuración">
      {TABS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
              active
                ? "border-accent text-fg"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
