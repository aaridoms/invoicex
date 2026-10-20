"use client";

import { optimizeLogo } from "@/app/helpers/logo";
import {
  createIssuer,
  deleteIssuer,
  listIssuers,
  updateIssuer,
} from "@/lib/data/issuers";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { IconBuilding, IconPlus, IconTrash, IconUpload } from "./icons";
import { canWrite, useSession } from "./SessionProvider";
import {
  Button,
  Card,
  Field,
  Input,
  Textarea,
  Toast,
} from "./ui";

const EMPTY = {
  brandTitle: "",
  companyName: "",
  cif: "",
  address1: "",
  address2: "",
  email: "",
  logoDataUrl: "",
  footerNote: "",
};

// Tamaño máximo del archivo subido; se guarda ya optimizado (JPG de 800 px)
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const NEW_ID = "nueva";

const pickFields = (issuer) =>
  Object.fromEntries(
    Object.keys(EMPTY).map((k) => [k, issuer?.[k] ?? EMPTY[k]])
  );

export default function SettingsForm() {
  const router = useRouter();
  const { org, role, issuers: sessionIssuers } = useSession();
  const writable = canWrite(role);
  // Arranca con los emisores que ya trae el layout (sin consulta inicial)
  const firstId = sessionIssuers[0]?.id || NEW_ID;
  const [issuers, setIssuers] = useState(sessionIssuers);
  const [selectedId, setSelectedId] = useState(firstId);
  const [form, setForm] = useState(() => pickFields(sessionIssuers[0]));
  const [savedForm, setSavedForm] = useState(() => pickFields(sessionIssuers[0]));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const logoInputRef = useRef(null);
  const toastTimer = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const isNew = selectedId === NEW_ID;

  const notify = useCallback((message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const select = (id, list) => {
    const fields = pickFields(list.find((i) => i.id === id));
    setSelectedId(id);
    setForm(fields);
    setSavedForm(fields);
  };

  // Recarga tras un cambio: la lista local para esta pantalla y
  // router.refresh() para que el layout (y con él el editor y el listado)
  // reciba los emisores actualizados
  const load = useCallback(
    async (preferId) => {
      try {
        const list = await listIssuers(org.id);
        setIssuers(list);
        const id = list.some((i) => i.id === preferId)
          ? preferId
          : list[0]?.id || NEW_ID;
        select(id, list);
        router.refresh();
      } catch (e) {
        console.error("Emisores:", e);
        notify("No se pudieron cargar las empresas", "error");
      }
    },
    [org.id, notify, router]
  );

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const confirmDiscard = () =>
    !dirty || window.confirm("Hay cambios sin guardar. ¿Descartarlos?");

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      notify("El logo es demasiado grande (máximo 5 MB).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const logoDataUrl = await optimizeLogo(String(reader.result || ""));
        setForm((f) => ({ ...f, logoDataUrl }));
      } catch {
        notify("No se pudo leer la imagen. Prueba con un PNG o JPG.", "error");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      notify("La razón social es obligatoria.", "warning");
      return;
    }
    setBusy(true);
    try {
      const saved = isNew
        ? await createIssuer(org.id, form)
        : await updateIssuer(selectedId, form);
      await load(saved.id);
      notify(isNew ? "Empresa creada" : "Cambios guardados");
    } catch (err) {
      console.error("Guardar emisor:", err);
      notify("No se pudieron guardar los cambios", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleNew = () => {
    if (!confirmDiscard()) return;
    setSelectedId(NEW_ID);
    setForm(EMPTY);
    setSavedForm(EMPTY);
  };

  const handleSelect = (id) => {
    if (id === selectedId || !confirmDiscard()) return;
    select(id, issuers);
  };

  const handleDelete = async () => {
    const name = savedForm.companyName || "esta empresa";
    if (!window.confirm(`¿Eliminar ${name}? No se puede deshacer.`)) return;
    try {
      await deleteIssuer(selectedId);
      await load();
      notify("Empresa eliminada");
    } catch (err) {
      notify(err.message || "No se pudo eliminar la empresa", "error");
    }
  };

  return (
    <div>
      <div className="grid items-start gap-6 grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Empresas emisoras">
            <div className="-mx-2 -mt-2 space-y-0.5">
              {issuers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    p.id === selectedId
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface-2/60 hover:text-fg"
                  }`}
                >
                  <IconBuilding
                    className={`h-4 w-4 shrink-0 ${p.id === selectedId ? "text-accent" : ""}`}
                  />
                  <span className="truncate">
                    {p.companyName || p.brandTitle || "Sin nombre"}
                  </span>
                </button>
              ))}
              {isNew ? (
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2 py-2 text-sm text-fg">
                  <IconPlus className="h-4 w-4 shrink-0 text-accent" />
                  Nueva empresa
                </div>
              ) : null}
            </div>
            {writable && !isNew ? (
              <Button
                size="sm"
                className="mt-3 w-full justify-center"
                onClick={handleNew}
              >
                <IconPlus className="h-3.5 w-3.5" />
                Nueva empresa
              </Button>
            ) : null}
          </Card>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <fieldset disabled={!writable} className="space-y-5">
            <Card
              title={isNew ? "Nueva empresa emisora" : "Datos del emisor"}
              description="Aparecen en la cabecera y el pie de cada factura."
            >
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Nombre comercial (opcional)"
                  htmlFor="brandTitle"
                  hint="Título grande de la factura. Si lo dejas vacío se usa la razón social."
                >
                  <Input
                    id="brandTitle"
                    value={form.brandTitle}
                    onChange={update("brandTitle")}
                    placeholder="Restaurante Ejemplo"
                  />
                </Field>
                <Field label="Razón social" htmlFor="companyName">
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={update("companyName")}
                    placeholder="Ejemplo Hostelería S.L."
                  />
                </Field>
                <Field label="NIF/CIF" htmlFor="cif">
                  <Input
                    id="cif"
                    value={form.cif}
                    onChange={update("cif")}
                    placeholder="B12345678"
                  />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="facturas@ejemplo.com"
                  />
                </Field>
                <Field label="Dirección" htmlFor="address1">
                  <Input
                    id="address1"
                    value={form.address1}
                    onChange={update("address1")}
                    placeholder="Calle Mayor 1"
                  />
                </Field>
                <Field label="Código postal y ciudad" htmlFor="address2">
                  <Input
                    id="address2"
                    value={form.address2}
                    onChange={update("address2")}
                    placeholder="41010 Sevilla"
                  />
                </Field>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-5">
              <Card title="Logo" description="PNG o JPG, máximo 5 MB.">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
                    {form.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.logoDataUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-zinc-400">Sin logo</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => logoInputRef.current?.click()}>
                      <IconUpload className="h-3.5 w-3.5" />
                      {form.logoDataUrl ? "Cambiar" : "Subir logo"}
                    </Button>
                    {form.logoDataUrl ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setForm((f) => ({ ...f, logoDataUrl: "" }))}
                      >
                        Quitar
                      </Button>
                    ) : null}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </Card>

              <Card
                title="Información adicional"
                description="Texto fijo al final de cada factura."
              >
                <Textarea
                  aria-label="Información adicional"
                  value={form.footerNote}
                  onChange={update("footerNote")}
                  placeholder="Forma de pago: transferencia a ES00 0000 0000 0000 0000 0000"
                />
              </Card>
            </div>
          </fieldset>

          {writable ? (
            <div className="flex items-center justify-between border-t border-border pt-5">
              {!isNew && ["owner", "admin"].includes(role) ? (
                <Button variant="danger" onClick={handleDelete}>
                  <IconTrash />
                  Eliminar empresa
                </Button>
              ) : isNew && issuers.length > 0 ? (
                <Button variant="ghost" onClick={() => select(issuers[0].id, issuers)}>
                  Cancelar
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                {dirty ? (
                  <span className="text-xs text-muted">Cambios sin guardar</span>
                ) : null}
                <Button variant="primary" type="submit" disabled={!dirty || busy}>
                  {busy ? "Guardando…" : isNew ? "Crear empresa" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Tu rol es de solo lectura: no puedes modificar estos datos.
            </p>
          )}
        </form>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
