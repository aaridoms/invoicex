"use client";

import {
  createProfile,
  deleteProfile,
  getSettings,
  listProfiles,
  saveSettings,
  setActiveProfile,
} from "@/app/helpers/settingsStore";
import { useEffect, useState } from "react";

export default function SettingsForm() {
  const [profiles, setProfiles] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [brandTitle, setBrandTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cif, setCif] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [email, setEmail] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [saved, setSaved] = useState("");

  const loadState = () => {
    const s = getSettings();
    const ps = listProfiles();
    setProfiles(ps);
    setActiveId(s?.id || (ps[0]?.id ?? ""));
    if (s) {
      setBrandTitle(s.brandTitle || "");
      setCompanyName(s.companyName || "");
      setCif(s.cif || "");
      setAddress1(s.address1 || "");
      setAddress2(s.address2 || "");
      setEmail(s.email || "");
      setLogoDataUrl(s.logoDataUrl || "");
    } else {
      setBrandTitle("");
      setCompanyName("");
      setCif("");
      setAddress1("");
      setAddress2("");
      setEmail("");
      setLogoDataUrl("");
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const hadActive = !!activeId;
    const ok = saveSettings({
      brandTitle,
      companyName,
      cif,
      address1,
      address2,
      email,
      logoDataUrl,
    });
    if (ok) {
      setSaved("Ajustes guardados");
      if (hadActive) {
        // Actualizar el perfil activo en memoria para reflejar inmediatamente en el selector
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === activeId
              ? {
                  ...p,
                  brandTitle,
                  companyName,
                  cif,
                  address1,
                  address2,
                  email,
                  logoDataUrl,
                }
              : p
          )
        );
      } else {
        // No había perfil: se creó uno nuevo en el store. Refrescamos lista e id activo.
        const s = getSettings();
        const ps = listProfiles();
        setProfiles(ps);
        if (s?.id) setActiveId(s.id);
      }
      setTimeout(() => setSaved(""), 2000);
      // Limpiar solo campos de texto (no perfiles ni logo)
      setBrandTitle("");
      setCompanyName("");
      setCif("");
      setAddress1("");
      setAddress2("");
      setEmail("");
      // logoDataUrl se mantiene para que la previsualización no desaparezca
    }
  };

  // Botón de limpiar eliminado para evitar borrar compañías por error

  const handleCreateProfile = () => {
    const created = createProfile({ brandTitle: "", companyName: "" });
    if (created) {
      // Actualizar inmediatamente el selector y el activo
      setProfiles((prev) => [...prev, created]);
      setActiveId(created.id);
      // Cargar valores del nuevo perfil activo
      loadState();
    }
  };

  const handleDeleteProfile = () => {
    if (!activeId) return;
    deleteProfile(activeId);
    loadState();
  };

  const handleChangeActive = (e) => {
    const id = e.target.value;
    setActiveId(id);
    setActiveProfile(id);
    loadState();
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configuración de empresa
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Estos datos se usarán en el encabezado del PDF.
          </p>
        </div>
        <div className="p-4 sm:p-6 space-y-6">
          {/* Selector de compañía */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Compañía activa
              </label>
              <select
                value={activeId}
                onChange={handleChangeActive}
                className="block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              >
                {profiles.length === 0 ? (
                  <option value="">Sin perfiles</option>
                ) : (
                  profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.companyName || p.brandTitle || p.id}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-transparent border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Nueva compañía
              </button>
              <button
                type="button"
                onClick={handleDeleteProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-transparent border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:text-red-300 dark:border-red-800/60 dark:hover:bg-red-900/20"
              >
                Eliminar actual
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="brandTitle"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Título/Marca (cabecera)
              </label>
              <input
                id="brandTitle"
                type="text"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Nombre de la empresa
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="cif"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                CIF/NIF
              </label>
              <input
                id="cif"
                type="text"
                value={cif}
                onChange={(e) => setCif(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="address1"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Dirección (línea 1)
              </label>
              <input
                id="address1"
                type="text"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="address2"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Dirección (línea 2)
              </label>
              <input
                id="address2"
                type="text"
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empresa@dominio.com"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo
            </label>
            <div className="mt-1 flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-gray-300 dark:border-zinc-700 overflow-hidden bg-white/70 dark:bg-zinc-900/60 flex items-center justify-center">
                {logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoDataUrl}
                    alt="Logo"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Sin logo
                  </span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block text-sm text-gray-700 dark:text-gray-300"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Se recomienda un PNG/JPG cuadrado. Se guardará localmente.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Guardar
            </button>
          </div>

          {saved ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {saved}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
