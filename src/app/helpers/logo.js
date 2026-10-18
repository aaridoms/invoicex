// Optimización del logo para el PDF.
//
// jsPDF procesa los PNG en JavaScript (descomprimir + recomprimir) cada vez
// que genera un documento: con un logo grande eso congela la interfaz en
// cada actualización de la vista previa. Convertimos el logo una sola vez a
// un JPG pequeño sobre fondo blanco, que jsPDF solo tiene que incrustar.

const MAX_SIDE = 800; // px: de sobra para imprimirlo a 40 mm (~500 ppp)
const cache = new Map(); // dataUrl original -> Promise<dataUrl JPG>

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen del logo"));
    img.src = src;
  });
}

async function convert(src) {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  // Las zonas transparentes de un PNG quedan en blanco, como el papel
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

// Devuelve (y recuerda) la versión optimizada de un logo en dataURL
export function optimizeLogo(src) {
  if (!src) return Promise.resolve("");
  if (!cache.has(src)) {
    const job = convert(src);
    job.catch(() => cache.delete(src)); // permitir reintentar si falla
    cache.set(src, job);
  }
  return cache.get(src);
}

// Ajustes listos para el PDF: mismo perfil con el logo ya optimizado
export async function withOptimizedLogo(settings) {
  if (!settings?.logoDataUrl) return settings;
  try {
    return { ...settings, logoDataUrl: await optimizeLogo(settings.logoDataUrl) };
  } catch {
    return { ...settings, logoDataUrl: "" };
  }
}
