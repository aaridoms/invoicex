"use client";

import { VAT_RATES } from "@/app/helpers/invoiceMath";
import { updateOrg } from "@/lib/data/org";
import { expandPrefix } from "@/lib/numbering";
import { canManageOrg } from "@/lib/roles";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSession } from "../SessionProvider";
import { Button, Card, Field, Input, Select, Textarea, Toast } from "../ui";

const PREFIX_EXAMPLES = ["{AAAA}-", "F{AA}/", "A/"];

export default function BillingSettings() {
  const router = useRouter();
  const { org, role } = useSession();
  const editable = canManageOrg(role);
  const initial = { name: org.name, billing: org.billing };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const b = form.billing;
  const setBilling = (patch) =>
    setForm((f) => ({ ...f, billing: { ...f.billing, ...patch } }));

  const notify = (message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const year = new Date().getFullYear();
  const example = `${expandPrefix(b.numberPrefix, year)}${"1".padStart(b.numberDigits, "0")}`;
  const resetsYearly = /\{AAAA\}|\{AA\}/.test(b.numberPrefix);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify("El nombre del negocio es obligatorio.", "warning");
      return;
    }
    setBusy(true);
    try {
      await updateOrg(org.id, form);
      setSaved(form);
      router.refresh(); // el editor y la barra lateral leen estos datos del layout
      notify("Cambios guardados");
    } catch (err) {
      console.error("Guardar facturación:", err);
      notify("No se pudieron guardar los cambios", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-5">
      <fieldset disabled={!editable} className="space-y-5">
        <Card title="Negocio">
          <Field label="Nombre del negocio" htmlFor="orgName">
            <Input
              id="orgName"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
        </Card>

        <Card
          title="Valores por defecto"
          description="Se aplican al crear una factura nueva; puedes cambiarlos en cada una."
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="IVA por defecto" htmlFor="defaultVat" hint="En hostelería suele ser el 10 %.">
              <Select
                id="defaultVat"
                value={b.defaultVat}
                onChange={(e) => setBilling({ defaultVat: Number(e.target.value) })}
              >
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r} %
                  </option>
                ))}
              </Select>
            </Field>
            <div className="pt-6">
              <label className="flex cursor-pointer select-none items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={b.defaultPricesIncludeVat}
                  onChange={(e) =>
                    setBilling({ defaultPricesIncludeVat: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
                />
                <span>
                  Precios con IVA incluido
                  <span className="mt-0.5 block text-xs text-muted">
                    Escribes el total cobrado y se desglosa la base.
                  </span>
                </span>
              </label>
            </div>
            <Field
              label="Notas por defecto"
              htmlFor="defaultNotes"
              hint="Por ejemplo, condiciones de pago o plazo de vencimiento."
              className="col-span-2"
            >
              <Textarea
                id="defaultNotes"
                value={b.defaultNotes}
                onChange={(e) => setBilling({ defaultNotes: e.target.value })}
                placeholder="Pago a 30 días mediante transferencia."
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Numeración"
          description="Formato de los números de factura. Las facturas ya emitidas no cambian."
        >
          <div className="grid grid-cols-[1fr_140px] gap-4">
            <Field
              label="Prefijo"
              htmlFor="numberPrefix"
              hint="Usa {AAAA} o {AA} para incluir el año."
            >
              <Input
                id="numberPrefix"
                value={b.numberPrefix}
                maxLength={20}
                onChange={(e) => setBilling({ numberPrefix: e.target.value })}
                className="tabular"
              />
            </Field>
            <Field label="Dígitos" htmlFor="numberDigits">
              <Select
                id="numberDigits"
                value={b.numberDigits}
                onChange={(e) => setBilling({ numberDigits: Number(e.target.value) })}
              >
                {[3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {PREFIX_EXAMPLES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBilling({ numberPrefix: p })}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted tabular hover:border-muted/50 hover:text-fg"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-surface-2 px-4 py-3 text-sm">
            Primera factura de la serie:{" "}
            <span className="font-semibold tabular">{example}</span>
            <p className="mt-1 text-xs text-muted">
              {resetsYearly
                ? "La numeración vuelve a empezar cada año."
                : "La numeración es continua, sin reiniciarse con el año."}{" "}
              Cada empresa emisora lleva su propia serie.
            </p>
          </div>
        </Card>
      </fieldset>

      {editable ? (
        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          {dirty ? <span className="text-xs text-muted">Cambios sin guardar</span> : null}
          <Button variant="primary" type="submit" disabled={!dirty || busy}>
            {busy ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Solo el dueño o un administrador pueden cambiar estos ajustes.
        </p>
      )}

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </form>
  );
}
