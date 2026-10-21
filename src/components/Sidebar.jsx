"use client";

import { getSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  IconBuilding,
  IconFile,
  IconHome,
  IconReceipt,
  IconSettings,
  IconShare,
  IconUsers,
} from "./icons";
import Logo from "./Logo";
import { useSession } from "./SessionProvider";

const NAV = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/invoices", label: "Facturas", Icon: IconFile },
  { href: "/expenses", label: "Gastos", Icon: IconReceipt },
  { href: "/contacts", label: "Clientes", Icon: IconUsers },
  { href: "/settings", label: "Configuración", Icon: IconSettings },
];

// Secciones previstas: se muestran para que se vea hacia dónde va la app
const COMING_SOON = [{ label: "Exportar al gestor", Icon: IconShare }];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, org } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleSignOut = async () => {
    setSigningOut(true);
    await getSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/60 px-3 py-5">
      <Link href="/" className="mb-8 px-3" aria-label="InvoiceX, inicio">
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

      <p className="mb-1.5 mt-7 px-3 text-[11px] font-medium uppercase tracking-wider text-muted/70">
        Próximamente
      </p>
      <ul className="flex flex-col gap-0.5" aria-label="Próximamente">
        {COMING_SOON.map(({ label, Icon }) => (
          <li
            key={label}
            className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted/60"
          >
            <Icon className="h-4 w-4" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto rounded-lg border border-border bg-surface-2/50 p-3">
        <div className="flex items-center gap-3">
          <IconBuilding className="h-4 w-4 shrink-0 text-muted" />
          <div className="min-w-0">
            <p className="truncate text-sm">{org.name}</p>
            <p className="truncate text-xs text-muted" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-2.5 w-full rounded-md px-2 py-1 text-left text-xs text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}
