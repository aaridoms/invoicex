// Tema de la interfaz: "dark" (por defecto), "light" o "system".
// Es una preferencia de cada dispositivo, así que vive en localStorage.

export const THEMES = ["dark", "light", "system"];
export const THEME_KEY = "invoicex:theme";
export const DEFAULT_THEME = "dark";

// Script que se ejecuta en <head> antes de pintar: evita el destello del
// tema equivocado al cargar la página
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(${JSON.stringify(
  THEMES
)}.indexOf(t)<0)t="${DEFAULT_THEME}";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="${DEFAULT_THEME}"}})()`;

export function getTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return THEMES.includes(t) ? t : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setTheme(theme) {
  const t = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    // Navegación privada sin almacenamiento: el tema dura hasta recargar
  }
}
