"use client";

import {
  createProfile,
  deleteProfile,
  getSettings,
  listProfiles,
  saveSettings,
  setActiveProfile,
} from "@/app/helpers/settingsStore";
import { optimizeLogo } from "@/app/helpers/logo";
import { useEffect, useRef, useState } from "react";
import { IconBuilding, IconPlus, IconTrash, IconUpload } from "./icons";
import {
  Button,
  Card,
  Field,
  Input,
  PageHeader,
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

// Tamaño máximo del archivo subido. Se guarda ya optimizado (JPG de 800 px,
// normalmente <100 KB), así que no llena el localStorage (≈5 MB en total).
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

const pickFields = (profile) =>
  Object.fromEntries(
    Object.keys(EMPTY).map((k) => [k, profile?.[k] ?? EMPTY[k]])
  );

export default function SettingsForm() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [savedForm, setSavedForm] = useState(EMPTY);
  const [toast, setToast] = useState(null);
  const logoInputRef = useRef(null);
  const toastTimer = useRef(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const notify = (message, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const loadState = () => {
    const active = getSettings();
    setProfiles(listProfiles());
    setActiveId(active?.id || "");
    const fields = pickFields(active);
    setForm(fields);
    setSavedForm(fields);
  };

  useEffect(() => {
    loadState();
  }, []);

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

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      notify("El nombre de la empresa es obligatorio.", "warning");
      return;
    }
    if (saveSettings(form)) {
      loadState();
      notify("Cambios guardados");
    } else {
      notify("No se pudieron guardar los cambios", "error");
    }
  };

  const handleCreateProfile = () => {
    if (!confirmDiscard()) return;
    createProfile();
    loadState();
  };

  const handleSelectProfile = (id) => {
    if (id === activeId || !confirmDiscard()) return;
    setActiveProfile(id);
    loadState();
  };

  const handleDeleteProfile = () => {
    if (!activeId) return;
    const name = savedForm.companyName || savedForm.brandTitle || "esta compañía";
    if (!window.confirm(`¿Eliminar ${name}? No se puede deshacer.`)) return;
    deleteProfile(activeId);
    loadState();
    notify("Compañía eliminada");
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-7">
      <PageHeader
        title="Configuración"
        description="Datos de la empresa que emite las facturas. Se guardan solo en este navegador."
      />

      <div className="grid items-start gap-6 grid-cols-[260px_minmax(0,1fr)]">
        <Card title="Compañías">
          <div className="-mx-2 -mt-2 space-y-0.5">
            {profiles.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted">
                Todavía no hay ninguna. Rellena el formulario y guarda para
                crear la primera.
              </p>
            ) : (
              profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    p.id === activeId
                      ? "bg-surface-2 text-fg"
                      : "text-muted hover:bg-surface-2/60 hover:text-fg"
                  }`}
                >
                  <IconBuilding
                    className={`h-4 w-4 shrink-0 ${p.id === activeId ? "text-accent" : ""}`}
                  />
                  <span className="truncate">
                    {p.companyName || p.brandTitle || "Sin nombre"}
                  </span>
                  {p.id === activeId ? (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-accent">
                      Activa
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
          <Button
            size="sm"
            className="mt-3 w-full justify-center"
            onClick={handleCreateProfile}
          >
            <IconPlus className="h-3.5 w-3.5" />
            Nueva compañía
          </Button>
        </Card>

        <form onSubmit={handleSave} className="space-y-5">
          <Card
            title="Datos del emisor"
            description="Aparecen en la cabecera y el pie de cada factura."
          >
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Nombre comercial (opcional)"
                htmlFor="brandTitle"
                hint="Título grande de la factura. Si lo dejas vacío se usa el nombre de la empresa."
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
                  <Button
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
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

          <div className="flex items-center justify-between border-t border-border pt-5">
            {activeId ? (
              <Button variant="danger" onClick={handleDeleteProfile}>
                <IconTrash />
                Eliminar compañía
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {dirty ? (
                <span className="text-xs text-muted">Cambios sin guardar</span>
              ) : null}
              <Button variant="primary" type="submit" disabled={!dirty}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </form>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
