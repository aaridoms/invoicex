// Ruta a la que volver tras iniciar sesión. Solo rutas internas: evita que
// un enlace manipulado (?next=https://otro-sitio) redirija fuera de la app.
export function safeNext(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
