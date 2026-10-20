"use client";

import { formatEuro } from "@/app/helpers/invoiceMath";
import { compactEuro, niceTicks } from "@/lib/stats";
import { useState } from "react";

const HEIGHT = 200; // px del área de barras
// Hueco libre sobre la marca más alta para la cifra del mes actual: así una
// barra al máximo nunca empuja su etiqueta fuera del gráfico
const HEADROOM = 22;
const PLOT = HEIGHT - HEADROOM;

const facturas = (n) => `${n} ${n === 1 ? "factura" : "facturas"}`;

// Cifra destacada del mes actual: euros enteros ("2.960 €"); el formato
// abreviado ("3 mil €") se queda para el eje, donde basta el orden de magnitud
const wholeEuro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
  useGrouping: "always",
});

// Columnas de base imponible por mes. Una sola serie: sin leyenda (el título
// de la tarjeta dice qué se ve). Pautas de la guía dataviz: barras de 24 px
// como máximo, extremo redondeado de 4 px, cuadradas en la base, rejilla
// fina, cifra solo en el mes actual y el resto en tooltip y tabla.
// showTable lo controla la tarjeta (el botón vive en su cabecera).
export default function RevenueChart({ series, showTable = false }) {
  const [active, setActive] = useState(null);

  const max = Math.max(...series.map((m) => m.base), 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const current = series.length - 1;
  const yLabel = (v) => (v === 0 ? "0" : compactEuro(v));
  const y = (v) => (v / top) * PLOT; // valor -> px desde la base

  return (
    <div>
      {showTable ? (
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
              <th className="py-2 font-medium">Mes</th>
              <th className="py-2 text-right font-medium">Facturas</th>
              <th className="py-2 text-right font-medium">Base imponible</th>
            </tr>
          </thead>
          <tbody>
            {series.map((m) => (
              <tr key={m.key} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 capitalize">
                  {m.label} {m.year}
                </td>
                <td className="py-1.5 text-right text-muted">{m.count}</td>
                <td className="py-1.5 text-right">{formatEuro(m.base)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex gap-3">
          {/* Eje Y */}
          <div
            className="relative w-14 shrink-0 text-right text-[11px] text-muted tabular"
            style={{ height: HEIGHT }}
            aria-hidden="true"
          >
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-0 -translate-y-1/2"
                style={{ bottom: y(t) }}
              >
                {yLabel(t)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            {/* Área de barras con la rejilla detrás */}
            <div className="relative" style={{ height: HEIGHT }}>
              {ticks.map((t) => (
                <div
                  key={t}
                  aria-hidden="true"
                  className={`absolute inset-x-0 h-px ${t === 0 ? "bg-border" : "bg-border/50"}`}
                  style={{ bottom: y(t) }}
                />
              ))}

              <ul
                className="absolute inset-0 flex items-end"
                aria-label="Base imponible por mes, últimos 12 meses"
              >
                {series.map((m, i) => {
                  const h = y(m.base);
                  const isActive = active === i;
                  return (
                    <li
                      key={m.key}
                      tabIndex={0}
                      aria-label={`${m.label} ${m.year}: ${formatEuro(m.base)}, ${facturas(m.count)}`}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      className="relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
                    >
                      {/* Cifra solo en el mes actual */}
                      {i === current && m.base > 0 && !isActive ? (
                        <span
                          className="absolute whitespace-nowrap text-[11px] font-medium text-fg tabular"
                          style={{ bottom: h + 6 }}
                        >
                          {wholeEuro.format(m.base)}
                        </span>
                      ) : null}

                      <span
                        className={`block w-full max-w-[24px] rounded-t-[4px] transition-colors ${
                          isActive ? "bg-accent" : "bg-chart"
                        }`}
                        style={{ height: Math.max(h, m.base > 0 ? 2 : 0) }}
                      />

                      {isActive ? (
                        <div
                          role="tooltip"
                          className="pointer-events-none absolute z-10 min-w-[120px] -translate-x-1/2 rounded-lg border border-border bg-surface-2 px-3 py-2 shadow-xl shadow-black/40"
                          style={{
                            bottom: Math.min(h + 10, HEIGHT - 10),
                            left: "50%",
                          }}
                        >
                          <p className="text-sm font-semibold text-fg tabular">
                            {formatEuro(m.base)}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            <span className="capitalize">{m.label}</span> {m.year} ·{" "}
                            {facturas(m.count)}
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Eje X */}
            <div className="mt-2 flex text-[11px] text-muted" aria-hidden="true">
              {series.map((m, i) => (
                <span
                  key={m.key}
                  className={`flex-1 text-center capitalize ${i === current ? "text-fg" : ""}`}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
