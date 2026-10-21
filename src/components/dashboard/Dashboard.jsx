"use client";

import { formatDate, formatEuro } from "@/app/helpers/invoiceMath";
import { listExpensesSince } from "@/lib/data/expenses";
import { listInvoicesSince, listRecentInvoices } from "@/lib/data/invoices";
import {
  dashboardSince,
  monthlySeries,
  summarize,
  topClients,
} from "@/lib/stats";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowRight,
  IconFile,
  IconPlus,
  IconReceipt,
  IconShare,
} from "../icons";
import { canWrite, useSession } from "../SessionProvider";
import { ButtonLink, Card, PageHeader } from "../ui";
import RevenueChart from "./RevenueChart";

// Panel de inicio. Cada bloque es independiente para que las próximas
// funcionalidades (gastos, resultado, exportación…) se añadan como
// tarjetas nuevas sin rehacer la página.

const greeting = (date) => {
  const h = date.getHours();
  return h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";
};

function StatTile({ label, value, hint, delta }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted">
        {delta ? (
          <span
            className={`inline-flex items-center gap-0.5 font-medium ${
              delta.value >= 0 ? "text-accent" : "text-danger"
            }`}
          >
            <span aria-hidden="true">{delta.value >= 0 ? "▲" : "▼"}</span>
            {delta.value >= 0 ? "+" : ""}
            {delta.value} %
            <span className="sr-only">{delta.label}</span>
          </span>
        ) : null}
        <span>{delta ? delta.label : hint}</span>
      </div>
    </div>
  );
}

const COMING_SOON = [
  {
    Icon: IconReceipt,
    title: "Datos con IA",
    text: "Extracción automática también desde fotos y facturas escaneadas.",
  },
  {
    Icon: IconShare,
    title: "Exportación para tu gestor",
    text: "Libros registro de IVA y los PDF del trimestre en un archivo.",
  },
];

export default function Dashboard() {
  const { org, role } = useSession();
  const [rows, setRows] = useState(null);
  const [recent, setRecent] = useState([]);
  const [expenseRows, setExpenseRows] = useState([]);
  const [error, setError] = useState(false);
  const [chartAsTable, setChartAsTable] = useState(false);
  // Fecha fija durante la visita para que todos los bloques cuadren. Se toma
  // en el navegador (no en el servidor, que va en UTC) para evitar
  // diferencias de hidratación en el saludo y los nombres de mes.
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);

  useEffect(() => {
    if (!now) return;
    let cancelled = false;
    Promise.all([
      listInvoicesSince(org.id, dashboardSince(now)),
      listRecentInvoices(org.id, 5),
      // Si los gastos fallan (p. ej. migración sin aplicar) el panel sigue
      listExpensesSince(org.id, dashboardSince(now)).catch(() => []),
    ])
      .then(([since, latest, expenses]) => {
        if (cancelled) return;
        setRows(since);
        setRecent(latest);
        setExpenseRows(expenses);
      })
      .catch((err) => {
        console.error("Panel de inicio:", err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [org.id, now]);

  const data = useMemo(() => {
    if (!rows || !now) return null;
    return {
      summary: summarize(rows, now),
      // Mismos cálculos sobre los gastos: IVA soportado del trimestre
      expenses: summarize(expenseRows, now),
      series: monthlySeries(rows, now, 12),
      clients: topClients(rows, now, 5),
    };
  }, [rows, expenseRows, now]);

  const s = data?.summary;
  const year = now?.getFullYear() ?? "";
  const prevMonthName = now
    ? new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
        "es-ES",
        { month: "long" }
      )
    : "";
  const dash = "—";

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title={now ? greeting(now) : "Inicio"}
        description={`Resumen de ${org.name}`}
        actions={
          canWrite(role) ? (
            <ButtonLink href="/invoices/new" variant="primary">
              <IconPlus className="h-4 w-4" />
              Nueva factura
            </ButtonLink>
          ) : null
        }
      />

      {error ? (
        <p className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          No se pudieron cargar los datos del panel. Recarga la página para
          intentarlo de nuevo.
        </p>
      ) : null}

      {/* Cifras principales */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <StatTile
          label={`Facturado en ${s?.monthName ?? "este mes"} (sin IVA)`}
          value={s ? formatEuro(s.month.base) : dash}
          hint={s ? `${s.month.count} ${s.month.count === 1 ? "factura" : "facturas"}` : " "}
          delta={
            s?.monthDelta != null
              ? { value: s.monthDelta, label: `vs ${prevMonthName}` }
              : null
          }
        />
        <StatTile
          label={`Facturado en ${year} (sin IVA)`}
          value={s ? formatEuro(s.year.base) : dash}
          hint={s ? `${s.year.count} ${s.year.count === 1 ? "factura" : "facturas"}` : " "}
        />
        <StatTile
          label={`IVA a liquidar · ${s?.quarter.label ?? ""}`}
          value={s ? formatEuro(s.quarter.vat - data.expenses.quarter.vat) : dash}
          hint={
            s
              ? `Repercutido ${formatEuro(s.quarter.vat)} − soportado ${formatEuro(data.expenses.quarter.vat)}`
              : " "
          }
        />
        <StatTile
          label={`Ticket medio ${year}`}
          value={s ? formatEuro(s.avgTicket) : dash}
          hint="Por factura, IVA incluido"
        />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-5">
        <Card
          title="Facturación mensual"
          description="Base imponible de los últimos 12 meses"
          className="col-span-2"
          actions={
            data?.series.some((m) => m.count > 0) ? (
              <button
                type="button"
                onClick={() => setChartAsTable((v) => !v)}
                className="text-xs text-muted hover:text-fg"
                aria-pressed={chartAsTable}
              >
                {chartAsTable ? "Ver gráfico" : "Ver tabla"}
              </button>
            ) : null
          }
        >
          {data ? (
            data.series.some((m) => m.count > 0) ? (
              <RevenueChart series={data.series} showTable={chartAsTable} />
            ) : (
              <EmptyState text="Cuando emitas facturas verás aquí su evolución mes a mes." />
            )
          ) : (
            <Loading />
          )}
        </Card>

        <Card title="Mejores clientes" description={`Por facturación en ${year}`}>
          {!data ? (
            <Loading />
          ) : data.clients.length === 0 ? (
            <EmptyState text="Aún no hay clientes este año." />
          ) : (
            <ol className="space-y-3.5">
              {data.clients.map((c) => (
                <li key={c.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 font-medium tabular">
                      {formatEuro(c.base)}
                    </span>
                  </div>
                  {/* Barra de proporción: pista de un tono más claro del mismo color */}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-chart/15">
                    <div
                      className="h-full rounded-full bg-chart"
                      style={{ width: `${Math.max(c.share * 100, 2)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {Math.round(c.share * 100)} % del año · {c.count}{" "}
                    {c.count === 1 ? "factura" : "facturas"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <Card
          title="Últimas facturas"
          className="col-span-2"
          actions={
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
            >
              Ver todas
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {!rows ? (
            <Loading />
          ) : recent.length === 0 ? (
            <EmptyState
              text="Todavía no has emitido ninguna factura."
              action={
                canWrite(role) ? (
                  <ButtonLink href="/invoices/new" size="sm">
                    <IconPlus className="h-3.5 w-3.5" />
                    Crear la primera
                  </ButtonLink>
                ) : null
              }
            />
          ) : (
            <ul className="-my-2 divide-y divide-border/60">
              {recent.map((it) => (
                <li key={it.id} className="flex items-center gap-4 py-2.5 text-sm">
                  <IconFile className="h-4 w-4 shrink-0 text-muted" />
                  <span className="w-24 shrink-0 font-medium tabular">{it.number}</span>
                  <span className="min-w-0 flex-1 truncate">{it.client?.nombre || "—"}</span>
                  <span className="shrink-0 text-muted tabular">{formatDate(it.issue_date)}</span>
                  <span className="w-24 shrink-0 text-right font-medium tabular">
                    {formatEuro(it.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Próximamente" description="Lo siguiente que llegará a InvoiceX">
          <ul className="space-y-4">
            {COMING_SOON.map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm">{title}</p>
                  <p className="mt-0.5 text-xs text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Loading() {
  return <p className="py-8 text-center text-sm text-muted">Cargando…</p>;
}

function EmptyState({ text, action }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted">{text}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
