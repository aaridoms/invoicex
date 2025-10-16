// Almacenamiento de ajustes multi-empresa en el navegador (sin servidor)
// v2 Estructura en localStorage:
// { version: 2, activeId: string|null, profiles: Array<Profile> }
// Profile: { id, brandTitle, companyName, cif, address1, address2, email, logoDataUrl }

const KEY_V2 = "invoicex_settings_v2";
const KEY_V1 = "invoicex_settings_v1"; // compat: migración

function isBrowser() {
  return typeof window !== "undefined";
}

function readRaw() {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (raw) return JSON.parse(raw);
    // Migración desde v1 si existe
    const rawV1 = localStorage.getItem(KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      const id = `default-${Date.now()}`;
      const migrated = {
        version: 2,
        activeId: id,
        profiles: [
          {
            id,
            brandTitle: v1.brandTitle || "",
            companyName: v1.companyName || "",
            cif: v1.cif || "",
            address1: v1.address1 || "",
            address2: v1.address2 || "",
            email: v1.email || "",
            logoDataUrl: v1.logoDataUrl || "",
          },
        ],
      };
      localStorage.setItem(KEY_V2, JSON.stringify(migrated));
      localStorage.removeItem(KEY_V1);
      return migrated;
    }
    // Estado inicial vacío
    const initial = { version: 2, activeId: null, profiles: [] };
    localStorage.setItem(KEY_V2, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.warn("No se pudo leer ajustes:", e);
    return { version: 2, activeId: null, profiles: [] };
  }
}

function writeRaw(state) {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(KEY_V2, JSON.stringify(state));
    // Notificar a la UI que los ajustes han cambiado
    try {
      window.dispatchEvent(new CustomEvent("invoicex:settings-changed"));
    } catch {}
    return true;
  } catch (e) {
    console.warn("No se pudo guardar ajustes:", e);
    return false;
  }
}

export function listProfiles() {
  const state = readRaw();
  return state.profiles;
}

export function getActiveProfile() {
  const state = readRaw();
  return state.profiles.find((p) => p.id === state.activeId) || null;
}

// Compat: mantener nombre anterior. Devuelve el perfil activo.
export function getSettings() {
  return getActiveProfile();
}

export function setActiveProfile(id) {
  const state = readRaw();
  if (!state.profiles.some((p) => p.id === id)) return false;
  state.activeId = id;
  return writeRaw(state);
}

export function createProfile(initial = {}) {
  const state = readRaw();
  const id = `p_${Date.now()}`;
  const profile = {
    id,
    brandTitle: "",
    companyName: "",
    cif: "",
    address1: "",
    address2: "",
    email: "",
    logoDataUrl: "",
    ...initial,
  };
  state.profiles.push(profile);
  state.activeId = id;
  writeRaw(state);
  return profile;
}

export function updateProfile(id, patch) {
  const state = readRaw();
  const idx = state.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  state.profiles[idx] = { ...state.profiles[idx], ...patch };
  return writeRaw(state);
}

export function deleteProfile(id) {
  const state = readRaw();
  const idx = state.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  state.profiles.splice(idx, 1);
  if (state.activeId === id) {
    state.activeId = state.profiles[0]?.id || null;
  }
  return writeRaw(state);
}

// Compat: actualizar perfil activo con los campos dados
export function saveSettings(settings) {
  const state = readRaw();
  if (!state.activeId) {
    const profile = createProfile(settings);
    return !!profile;
  }
  return updateProfile(state.activeId, settings);
}

// Limpia todo el almacenamiento de ajustes
export function clearSettings() {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(KEY_V2);
    try {
      window.dispatchEvent(new CustomEvent("invoicex:settings-changed"));
    } catch {}
    return true;
  } catch (e) {
    console.warn("No se pudo limpiar ajustes:", e);
    return false;
  }
}
