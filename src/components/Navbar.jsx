"use client";

import { getSettings } from "@/app/helpers/settingsStore";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function App() {
  const pathname = usePathname();
  const [activeLabel, setActiveLabel] = useState("");
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const linkClass = (href) =>
    `text-sm rounded-md px-3 py-1.5 transition ${
      isActive(href)
        ? "bg-white/10 text-white ring-1 ring-white/10"
        : "text-gray-200 hover:text-white hover:bg-white/5"
    }`;

  useEffect(() => {
    const update = () => {
      try {
        const s = getSettings();
        const name = s?.brandTitle || s?.companyName || "Sin perfil";
        setActiveLabel(name);
      } catch (e) {
        setActiveLabel("");
      }
    };
    update();
    window.addEventListener("invoicex:settings-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("invoicex:settings-changed", update);
      window.removeEventListener("storage", update);
    };
  }, [pathname]);

  return (
    <Navbar
      isBlurred
      maxWidth="xl"
      position="sticky"
      className="bg-slate-900/60 border-b border-white/10 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 px-4 sm:px-6 lg:px-8"
    >
      <NavbarBrand>
        <Link
          href="/"
          className="font-bold text-white tracking-tight hover:opacity-90"
        >
          InvoiceX
        </Link>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex" justify="center">
        {activeLabel ? (
          <span className="text-xs text-gray-200 bg-white/5 ring-1 ring-white/10 rounded-full px-2.5 py-1">
            Perfil: {activeLabel}
          </span>
        ) : null}
      </NavbarContent>
      <NavbarContent className="hidden sm:flex gap-2" justify="end">
        <NavbarItem>
          <Link href="/" className={linkClass("/")}>
            Formulario
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link href="/invoices" className={linkClass("/invoices")}>
            Historial
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link
            href="/settings"
            className={
              linkClass("/settings") +
              " inline-flex items-center justify-center w-9 h-9 p-0"
            }
            aria-label="Configuración"
            title="Configuración"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M11.078 2.25c-.917 0-1.699.663-1.84 1.57l-.153.984a8.27 8.27 0 0 0-1.548.895l-.924-.383a1.875 1.875 0 0 0-2.39.883l-.75 1.5a1.875 1.875 0 0 0 .49 2.323l.79.592a8.42 8.42 0 0 0 0 1.79l-.79.592c-.86.646-1.158 1.79-.49 2.323l.75 1.5c.47.94 1.57 1.34 2.39.883l.924-.383c.48.36.995.666 1.548.895l.153.984c.141.907.923 1.57 1.84 1.57h1.5c.917 0 1.699-.663 1.84-1.57l.153-.984c.553-.229 1.068-.535 1.548-.895l.924.383c.82.457 1.92.057 2.39-.883l.75-1.5c.667-.533.37-1.677-.49-2.323l-.79-.592c.045-.294.068-.594.068-.895 0-.302-.023-.602-.068-.895l.79-.592c.86-.646 1.158-1.79.49-2.323l-.75-1.5a1.875 1.875 0 0 0-2.39-.883l-.924.383a8.27 8.27 0 0 0-1.548-.895l-.153-.984a1.875 1.875 0 0 0-1.84-1.57h-1.5zm.422 8.25a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
