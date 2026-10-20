"use client";

import { getTheme, setTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Card } from "../ui";

const OPTIONS = [
  { value: "dark", label: "Oscuro", preview: ["#0a0a0c", "#1a1a1f", "#34d399"] },
  { value: "light", label: "Claro", preview: ["#f6f6f8", "#ffffff", "#047857"] },
  { value: "system", label: "Sistema", preview: null },
];

// Miniatura del tema: fondo, tarjeta y acento
function Swatch({ colors }) {
  if (!colors) {
    // "Sistema": mitad oscuro, mitad claro
    return (
      <span className="flex h-14 w-full overflow-hidden rounded-md border border-border">
        <span className="flex-1 bg-[#0a0a0c]" />
        <span className="flex-1 bg-[#f6f6f8]" />
      </span>
    );
  }
  const [bg, card, accent] = colors;
  return (
    <span
      className="flex h-14 w-full items-end gap-1.5 rounded-md border border-border p-2"
      style={{ background: bg }}
    >
      <span className="h-6 flex-1 rounded" style={{ background: card }} />
      <span className="h-3 w-6 rounded-sm" style={{ background: accent }} />
    </span>
  );
}

export default function PreferencesSettings() {
  // El valor real solo se conoce en el navegador (localStorage)
  const [theme, setThemeState] = useState(null);
  useEffect(() => setThemeState(getTheme()), []);

  const choose = (value) => {
    setTheme(value);
    setThemeState(value);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Card
        title="Apariencia"
        description="Se guarda en este dispositivo. «Sistema» sigue el modo claro u oscuro de tu ordenador."
      >
        <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => {
            const selected = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(o.value)}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  selected
                    ? "border-accent ring-2 ring-accent/25"
                    : "border-border hover:border-muted/50"
                }`}
              >
                <Swatch colors={o.preview} />
                <span className="mt-2 flex items-center justify-between text-sm">
                  {o.label}
                  {selected ? (
                    <span className="text-xs font-medium text-accent">Activo</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
