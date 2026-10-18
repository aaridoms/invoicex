"use client";

import { getSettings } from "@/app/helpers/settingsStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBuilding, IconFile, IconHistory, IconSettings } from "./icons";
import Logo from "./Logo";

const NAV = [
  { href: "/", label: "Nueva factura", Icon: IconFile },
  { href: "/invoices", label: "Historial", Icon: IconHistory },
  { href: "/settings", label: "Configuración", Icon: IconSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const update = () => {
      const s = getSettings();
      setCompany(s ? s.companyName || s.brandTitle || "Sin nombre" : "");
    };
    update();
    window.addEventListener("invoicex:settings-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("invoicex:settings-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 px-3 py-5">
      <Link href="/" className="mb-8 px-3" aria-label="InvoiceX, nueva factura">
        <Logo />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive(href)
                ? "bg-surface-2 text-fg"
                : "text-muted hover:bg-surface-2/60 hover:text-fg"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive(href) ? "text-accent" : ""}`} />
            {label}
          </Link>
        ))}
      </nav>

      <Link
        href="/settings"
        className="mt-auto flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 transition-colors hover:border-muted/40"
      >
        <IconBuilding className="h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted">
            Emisor
          </p>
          <p className="truncate text-sm">
            {company === null ? "…" : company || "Sin compañía"}
          </p>
        </div>
      </Link>
    </aside>
  );
}
