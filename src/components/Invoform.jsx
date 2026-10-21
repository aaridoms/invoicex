"use client";

import { invoicePreviewData } from "@/app/helpers/generatePDF";
import {
  DEFAULT_VAT,
  VAT_RATES,
  computeInvoice,
  formatEuro,
} from "@/app/helpers/invoiceMath";
import { withOptimizedLogo } from "@/app/helpers/logo";
import {
  getInvoice,
  invoiceNumberExists,
  issueInvoice,
  suggestNextInvoiceNumber,
  toInvoice,
} from "@/lib/data/invoices";
import { lastIssuerId, rememberIssuer } from "@/lib/data/issuers";
import { clientKey } from "@/lib/contacts";
import { createContact, listContacts } from "@/lib/data/contacts";
import ClientField from "./invoice/ClientField";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconPlus, IconTrash } from "./icons";
import PdfPreview from "./PdfPreview";
import { canWrite, useSession } from "./SessionProvider";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toast,
} from "./ui";

const todayISO = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

let lineSeq = 0;
// La primera línea lleva un id fijo para que coincida entre el render del
// servidor y el del navegador (evita errores de hidratación).
const newLine = (id = `l${Date.now()}_${lineSeq++}`, iva = DEFAULT_VAT) => ({
  id,
  concepto: "",
  cantidad: "1",
  precio: "",
  iva,
});

const EMPTY_CLIENT = { nombre: "", cif: "", direccion: "", ciudad: "" };

export default function Invoform() {
  // Los emisores llegan ya cargados desde el layout (sin consulta extra)
  const { org, role, issuers } = useSession();
  const writable = canWrite(role);
  // Valores por defecto y serie del negocio (Configuración → Facturación)
  const defaults = org.billing;
  const blankLine = (id) => newLine(id, defaults.defaultVat);
  const [issuerId, setIssuerId] = useState("");
  const [nFactura, setNFactura] = useState("");
  const [fecha, setFecha] = useState("");
  const [cliente, setCliente] = useState(EMPTY_CLIENT);
  const [clientId, setClientId] = useState(null); // ficha enlazada
  const [saveClient, setSaveClient] = useState(true); // crear ficha al emitir
  const [contacts, setContacts] = useState([]);

  // Clientes guardados para el autocompletado
  useEffect(() => {
    let cancelled = false;
    listContacts(org.id)
      .then((list) => !cancelled && setContacts(list))
      .catch((err) => console.error("Contactos:", err));
    return () => {
      cancelled = true;
    };
  }, [org.id]);
  const [items, setItems] = useState(() => [blankLine("line-1")]);
  const [pricesIncludeVat, setPricesIncludeVat] = useState(defaults.defaultPricesIncludeVat);
  const [notas, setNotas] = useState(defaults.defaultNotes);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const toastTimer = useRef(null);

  const notify = (message, type = "success", ms = 4500) => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const issuer = issuers?.find((i) => i.id === issuerId) || null;

  // Número siguiente del emisor elegido y fecha de hoy
  const prefillInvoiceData = useCallback(async (forIssuerId) => {
    setFecha(todayISO());
    if (!forIssuerId) return;
    try {
      setNFactura(await suggestNextInvoiceNumber(forIssuerId, defaults));
    } catch (err) {
      console.error("Numeración:", err);
    }
  }, [defaults]);

  // Se elige el último emisor usado en este navegador (localStorage solo
  // existe en el cliente, por eso va en un efecto)
  useEffect(() => {
    setIssuerId((current) => {
      if (issuers.some((i) => i.id === current)) return current;
      const remembered = lastIssuerId();
      return issuers.some((i) => i.id === remembered)
        ? remembered
        : issuers[0]?.id || "";
    });
  }, [issuers]);

  useEffect(() => {
    if (issuerId) prefillInvoiceData(issuerId);
  }, [issuerId, prefillInvoiceData]);

  // Factura duplicada desde el historial (?duplicar=<id>): se copian
  // emisor, cliente, conceptos y notas; número y fecha son siempre nuevos.
  useEffect(() => {
    const dupId = new URLSearchParams(window.location.search).get("duplicar");
    if (!dupId) return;
    window.history.replaceState(null, "", window.location.pathname);
    getInvoice(dupId)
      .then((row) => {
        const src = toInvoice(row);
        setIssuerId(row.issuer_id);
        setCliente({ ...EMPTY_CLIENT, ...src.cliente });
        setClientId(row.client_id || null);
        setItems(
          src.items.length
            ? src.items.map((it) => ({ ...newLine(), ...it, id: newLine().id }))
            : [newLine()]
        );
        setPricesIncludeVat(!!src.pricesIncludeVat);
        setNotas(src.notas);
        notify(`Datos copiados de la factura ${row.number}`);
      })
      .catch(() => notify("No se pudo cargar la factura a duplicar", "error"));
  }, []);

  const handleIssuerChange = (id) => {
    setIssuerId(id);
    rememberIssuer(id);
  };

  const invoice = useMemo(
    () => ({
      nFactura: nFactura.trim(),
      fecha,
      cliente,
      items,
      pricesIncludeVat,
      notas,
    }),
    [nFactura, fecha, cliente, items, pricesIncludeVat, notas]
  );

  const calc = useMemo(
    () => computeInvoice(items, { pricesIncludeVat }),
    [items, pricesIncludeVat]
  );

  // Ajustes para el PDF con el logo ya optimizado (se calcula una vez por
  // logo; ver helpers/logo.js). undefined mientras se prepara.
  const [pdfSettings, setPdfSettings] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    withOptimizedLogo(issuer).then((s) => {
      if (!cancelled) setPdfSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, [issuers, issuer]);

  // Vista previa en vivo (con un pequeño retardo para no regenerar en cada tecla)
  useEffect(() => {
    if (pdfSettings === undefined) return;
    const t = setTimeout(() => {
      try {
        setPreviewData(invoicePreviewData(invoice, pdfSettings));
      } catch (err) {
        // La vista previa nunca debe romper el formulario
        console.error("Vista previa PDF:", err);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [invoice, pdfSettings]);

  const updateCliente = (field) => (e) =>
    setCliente((c) => ({ ...c, [field]: e.target.value }));

  const updateItem = (id, field, value) =>
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );

  const focusNewLine = useRef(false);
  const formRef = useRef(null);

  const addItem = () => {
    focusNewLine.current = true;
    setItems((list) => [...list, blankLine()]);
  };

  // Al añadir una línea, el cursor salta a su descripción
  useEffect(() => {
    if (!focusNewLine.current) return;
    focusNewLine.current = false;
    const inputs = formRef.current?.querySelectorAll("[data-line-id]");
    inputs?.[inputs.length - 1]?.focus();
  }, [items.length]);

  const removeItem = (id) =>
    setItems((list) =>
      list.length === 1 ? [blankLine()] : list.filter((it) => it.id !== id)
    );

  // Al elegir una ficha se copian sus datos a la factura y queda enlazada
  const selectContact = (c) => {
    setCliente({ nombre: c.name, cif: c.taxId, direccion: c.address, ciudad: c.city });
    setClientId(c.id);
  };

  // Ficha a la que enlazar la factura al emitirla: la elegida; o, si se
  // pidió guardar el cliente, una existente con el mismo NIF/nombre o una
  // nueva. Si falla, la factura se emite igualmente sin enlazar.
  const resolveClientId = async () => {
    if (clientId) return clientId;
    if (!saveClient || !cliente.nombre.trim()) return null;
    const draft = {
      name: cliente.nombre,
      taxId: cliente.cif,
      address: cliente.direccion,
      city: cliente.ciudad,
      isClient: true,
      isSupplier: false,
    };
    const existing = contacts.find((c) => clientKey(c) === clientKey(draft));
    if (existing) return existing.id;
    try {
      const created = await createContact(org.id, draft);
      setContacts((list) => [...list, created]);
      return created.id;
    } catch (err) {
      console.error("Guardar cliente:", err);
      return null;
    }
  };

  const resetForm = () => {
    setCliente(EMPTY_CLIENT);
    setClientId(null);
    setSaveClient(true);
    setItems([blankLine()]);
    setNotas(defaults.defaultNotes);
    setPricesIncludeVat(defaults.defaultPricesIncludeVat);
    prefillInvoiceData(issuerId);
  };

  const validate = () => {
    if (!writable) return "Tu usuario solo puede consultar facturas.";
    if (!issuer) return "Configura primero la empresa emisora.";
    const missing = [];
    if (!invoice.nFactura) missing.push("número");
    if (!fecha) missing.push("fecha");
    if (!cliente.nombre.trim()) missing.push("cliente");
    if (calc.lines.length === 0) missing.push("al menos un concepto");
    return missing.length ? `Falta: ${missing.join(", ")}.` : "";
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;
    const problem = validate();
    if (problem) {
      notify(problem, "warning");
      return;
    }
    setSubmitting(true);
    try {
      if (await invoiceNumberExists(issuer.id, invoice.nFactura)) {
        notify(
          `Ya existe la factura ${invoice.nFactura}. Usa otro número para no duplicarla.`,
          "error",
          6000
        );
        return;
      }
      const { doc, filename } = await issueInvoice({
        orgId: org.id,
        issuer: await withOptimizedLogo(issuer),
        invoice,
        clientId: await resolveClientId(),
      });
      doc.save(filename);
      notify(`Factura guardada y descargada: ${filename}`);
      resetForm();
    } catch (err) {
      notify(err?.message || "No se pudo generar la factura", "error", 6000);
    } finally {
      setSubmitting(false);
    }
  };

  // Enter no envía el formulario (evita facturas accidentales).
  // Enter en el último concepto añade una línea; Ctrl+Enter genera el PDF.
  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || e.target.tagName === "TEXTAREA") return;
    if (e.ctrlKey || e.metaKey) {
      handleSubmit(e);
      return;
    }
    if (e.target.tagName === "INPUT") {
      e.preventDefault();
      const lines = e.currentTarget.querySelectorAll("[data-line-id]");
      if (e.target === lines[lines.length - 1]) addItem();
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-7">
      <PageHeader
        title="Nueva factura"
        description={
          issuers.length === 0 ? (
            <>
              No hay empresa emisora.{" "}
              <Link href="/settings" className="text-accent hover:underline">
                Configúrala aquí
              </Link>
            </>
          ) : issuers.length === 1 ? (
            <>
              Emitida por{" "}
              <span className="text-fg">
                {issuer?.companyName || issuer?.brandTitle}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-2">
              Emitida por
              <Select
                aria-label="Empresa emisora"
                value={issuerId}
                onChange={(e) => handleIssuerChange(e.target.value)}
                className="!h-7 !w-auto !py-0 text-xs"
              >
                {issuers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.companyName || i.brandTitle}
                  </option>
                ))}
              </Select>
            </span>
          )
        }
        actions={
          <>
            <Button variant="ghost" onClick={resetForm}>
              Limpiar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="invoice-form"
              disabled={submitting || !writable}
            >
              {submitting ? "Generando…" : "Generar PDF"}
            </Button>
          </>
        }
      />

      <div className="grid items-start gap-6 min-[1400px]:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
        <form
          id="invoice-form"
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          className="space-y-5"
          noValidate
        >
          <div className="grid grid-cols-[3fr_2fr] gap-5">
            <Card title="Factura">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Número" htmlFor="nFactura">
                  <Input
                    id="nFactura"
                    value={nFactura}
                    onChange={(e) => setNFactura(e.target.value)}
                    placeholder="2026-0001"
                    autoComplete="off"
                    className="tabular"
                  />
                </Field>
                <Field label="Fecha" htmlFor="fecha">
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Resumen">
              <dl className="space-y-1.5 text-sm tabular">
                <div className="flex justify-between text-muted">
                  <dt>Base imponible</dt>
                  <dd>{formatEuro(calc.base)}</dd>
                </div>
                <div className="flex justify-between text-muted">
                  <dt>IVA</dt>
                  <dd>{formatEuro(calc.cuota)}</dd>
                </div>
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="text-accent">{formatEuro(calc.total)}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card
            title="Cliente"
            actions={
              clientId ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-accent">Cliente guardado</span>
                  <button
                    type="button"
                    onClick={() => setClientId(null)}
                    className="text-muted hover:text-fg"
                  >
                    Desvincular
                  </button>
                </span>
              ) : cliente.nombre.trim() && writable ? (
                <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={saveClient}
                    onChange={(e) => setSaveClient(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[rgb(var(--accent))]"
                  />
                  Guardar en mis clientes
                </label>
              ) : null
            }
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre o razón social" htmlFor="cliente">
                <ClientField
                  id="cliente"
                  value={cliente.nombre}
                  contacts={contacts}
                  linked={!!clientId}
                  onType={(nombre) => {
                    setCliente((c) => ({ ...c, nombre }));
                    setClientId(null); // otro nombre: ya no es la ficha elegida
                  }}
                  onSelect={selectContact}
                />
              </Field>
              <Field label="NIF/CIF" htmlFor="cif">
                <Input
                  id="cif"
                  value={cliente.cif}
                  onChange={updateCliente("cif")}
                  placeholder="B12345678"
                />
              </Field>
              <Field label="Dirección" htmlFor="direccion">
                <Input
                  id="direccion"
                  value={cliente.direccion}
                  onChange={updateCliente("direccion")}
                  placeholder="Calle, número, piso"
                />
              </Field>
              <Field label="Código postal y ciudad" htmlFor="ciudad">
                <Input
                  id="ciudad"
                  value={cliente.ciudad}
                  onChange={updateCliente("ciudad")}
                  placeholder="41010 Sevilla"
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Conceptos"
            actions={
              <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={pricesIncludeVat}
                  onChange={(e) => setPricesIncludeVat(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[rgb(var(--accent))]"
                />
                Precios con IVA incluido
              </label>
            }
          >
            <div className="grid grid-cols-[minmax(140px,1fr)_56px_92px_72px_88px_28px] gap-2 px-0.5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
              <span>Descripción</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">
                {pricesIncludeVat ? "Precio c/IVA" : "Precio"}
              </span>
              <span>IVA</span>
              <span className="text-right">Importe</span>
              <span />
            </div>

            <div className="space-y-2">
              {items.map((it) => {
                const line = calc.lines.find((l) => l.id === it.id);
                return (
                  <div
                    key={it.id}
                    className="group grid grid-cols-[minmax(140px,1fr)_56px_92px_72px_88px_28px] items-center gap-2"
                  >
                    <Input
                      aria-label="Descripción"
                      data-line-id={it.id}
                      value={it.concepto}
                      onChange={(e) =>
                        updateItem(it.id, "concepto", e.target.value)
                      }
                      placeholder="Menú del día, comida de grupo…"
                    />
                    <Input
                      aria-label="Cantidad"
                      inputMode="decimal"
                      value={it.cantidad}
                      onChange={(e) =>
                        updateItem(it.id, "cantidad", e.target.value)
                      }
                      className="text-right tabular"
                    />
                    <Input
                      aria-label="Precio"
                      inputMode="decimal"
                      value={it.precio}
                      onChange={(e) =>
                        updateItem(it.id, "precio", e.target.value)
                      }
                      placeholder="0,00"
                      className="text-right tabular"
                    />
                    <Select
                      aria-label="IVA"
                      className="!px-2 tabular"
                      value={it.iva}
                      onChange={(e) =>
                        updateItem(it.id, "iva", Number(e.target.value))
                      }
                    >
                      {VAT_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </Select>
                    <span className="text-right text-sm tabular text-fg">
                      {line ? formatEuro(line.base) : "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(it.id)}
                      aria-label="Eliminar línea"
                      className="opacity-40 group-hover:opacity-100 hover:!text-danger"
                    >
                      <IconTrash />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start justify-between gap-6">
              <Button variant="secondary" size="sm" onClick={addItem}>
                <IconPlus className="h-3.5 w-3.5" />
                Añadir línea
              </Button>
              <dl className="w-64 space-y-1.5 text-sm tabular">
                <div className="flex justify-between text-muted">
                  <dt>Base imponible</dt>
                  <dd>{formatEuro(calc.base)}</dd>
                </div>
                {calc.byRate.map((g) => (
                  <div key={g.iva} className="flex justify-between text-muted">
                    <dt>IVA {g.iva}%</dt>
                    <dd>{formatEuro(g.cuota)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{formatEuro(calc.total)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          <Card title="Notas" description="Opcional. Aparecen al final de la factura.">
            <Textarea
              aria-label="Notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej.: Comida de empresa del 15/10 para 12 personas."
            />
          </Card>
        </form>

        <aside className="min-[1400px]:sticky min-[1400px]:top-7 max-w-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted">
              Vista previa
            </span>
            <span className="text-xs text-muted/70">Ctrl + Enter para generar</span>
          </div>
          <PdfPreview data={previewData} />
        </aside>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
