"use client";

import { formatDate, formatEuro } from "@/app/helpers/invoiceMath";
import { fold } from "@/lib/contacts";
import { listExpenses } from "@/lib/data/expenses";
import { EXPENSE_CATEGORIES, categoryLabel } from "@/lib/expenses";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconFile, IconPlus, IconReceipt, IconSearch } from "../icons";
import { canWrite, useSession } from "../SessionProvider";
import { ButtonLink, Input, PageHeader, Select } from "../ui";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default function ExpensesList() {
  const router = useRouter();
  const { org, role } = useSession();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [now, setNow] = useState(null);

  useEffect(() => setNow(new Date()), []);

  useEffect(() => {
    listExpenses(org.id)
      .then(setItems)
      .catch((err) => {
        console.error("Gastos:", err);
        setError(true);
        setItems([]);
      });
  }, [org.id]);

  const visible = useMemo(() => {
    const q = fold(query);
    return (items || []).filter(
      (e) =>
        (category === "all" || e.category === category) &&
        (!q ||
          fold(e.supplier.nombre).includes(q) ||
          fold(e.number).includes(q) ||
          formatDate(e.issueDate).includes(q))
    );
  }, [items, query, category]);

  const stats = useMemo(() => {
    if (!now || !items) return null;
    const year = String(now.getFullYear());
    const month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const q = Math.floor(now.getMonth() / 3);
    const qMonths = [1, 2, 3].map((i) => `${year}-${String(q * 3 + i).padStart(2, "0")}`);
    const sum = (list, k) => list.reduce((s, e) => s + e[k], 0);
    const inMonth = items.filter((e) => e.issueDate.startsWith(month));
    const inQuarter = items.filter((e) => qMonths.includes(e.issueDate.slice(0, 7)));
    const inYear = items.filter((e) => e.issueDate.startsWith(year));
    return {
      monthBase: sum(inMonth, "base"),
      monthCount: inMonth.length,
      quarterVat: sum(inQuarter, "vat"),
      quarterLabel: `T${q + 1} ${year}`,
      yearBase: sum(inYear, "base"),
      yearCount: inYear.length,
      monthName: now.toLocaleDateString("es-ES", { month: "long" }),
      year,
    };
  }, [items, now]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Gastos"
        description="Facturas recibidas de tus proveedores."
        actions={
          canWrite(role) ? (
            <ButtonLink href="/expenses/new" variant="primary">
              <IconPlus className="h-4 w-4" />
              Subir gasto
            </ButtonLink>
          ) : null
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat
          label={`Gastos en ${stats?.monthName ?? "este mes"} (sin IVA)`}
          value={stats ? formatEuro(stats.monthBase) : "—"}
          hint={stats ? plural(stats.monthCount, "factura", "facturas") : " "}
        />
        <Stat
          label={`IVA soportado · ${stats?.quarterLabel ?? ""}`}
          value={stats ? formatEuro(stats.quarterVat) : "—"}
          hint="El que puedes deducir en el 303"
        />
        <Stat
          label={`Gastos en ${stats?.year ?? ""} (sin IVA)`}
          value={stats ? formatEuro(stats.yearBase) : "—"}
          hint={stats ? plural(stats.yearCount, "factura", "facturas") : " "}
        />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              aria-label="Buscar gastos"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por proveedor, nº o fecha"
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="!w-auto"
          >
            <option value="all">Todas las categorías</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        {items === null ? (
          <p className="px-5 py-10 text-center text-sm text-muted">Cargando…</p>
        ) : error ? (
          <p className="px-5 py-10 text-center text-sm text-danger">
            No se pudieron cargar los gastos. Si acabas de actualizar, comprueba
            que has aplicado la migración de gastos en Supabase.
          </p>
        ) : items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <IconReceipt className="mx-auto h-8 w-8 text-muted/60" />
            <p className="mt-3 text-sm text-fg">Aún no hay gastos</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              Sube las facturas de tus proveedores: con un PDF digital los datos
              se rellenan solos y tú solo los revisas.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No hay gastos que coincidan.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-5 py-2.5 font-medium">Fecha</th>
                <th className="px-5 py-2.5 font-medium">Proveedor</th>
                <th className="px-5 py-2.5 font-medium">Nº factura</th>
                <th className="px-5 py-2.5 font-medium">Categoría</th>
                <th className="px-5 py-2.5 text-right font-medium">Base</th>
                <th className="px-5 py-2.5 text-right font-medium">IVA</th>
                <th className="px-5 py-2.5 text-right font-medium">Total</th>
                <th className="w-8 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr
                  key={e.id}
                  tabIndex={0}
                  onClick={() => router.push(`/expenses/${e.id}`)}
                  onKeyDown={(ev) => ev.key === "Enter" && router.push(`/expenses/${e.id}`)}
                  className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-surface-2/50 focus-visible:bg-surface-2/50"
                >
                  <td className="px-5 py-3 text-muted tabular">{formatDate(e.issueDate)}</td>
                  <td className="max-w-[240px] truncate px-5 py-3 font-medium">
                    {e.supplier.nombre || "—"}
                  </td>
                  <td className="px-5 py-3 text-muted tabular">{e.number || "—"}</td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-muted">
                    {categoryLabel(e.category)}
                  </td>
                  <td className="px-5 py-3 text-right tabular">{formatEuro(e.base)}</td>
                  <td className="px-5 py-3 text-right text-muted tabular">{formatEuro(e.vat)}</td>
                  <td className="px-5 py-3 text-right font-medium tabular">{formatEuro(e.total)}</td>
                  <td className="px-3 py-3 text-muted" title={e.fileName || "Sin documento"}>
                    {e.filePath ? <IconFile className="h-4 w-4" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
