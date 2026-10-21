// pdf.js compartido: vista previa de facturas y lectura del texto de PDFs
// recibidos. El análisis va en un Web Worker para no bloquear la interfaz.

let pdfjsPromise = null;

export function loadPdfjs() {
  pdfjsPromise ??= import("pdfjs-dist/build/pdf").then(async (pdfjs) => {
    if (typeof Worker !== "undefined") {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("../workers/pdf.worker.js", import.meta.url)
      );
    } else {
      // Sin Web Workers: pdf.js trabaja en el hilo principal
      await import("pdfjs-dist/build/pdf.worker.entry");
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

// Texto de un PDF reconstruido por líneas (los fragmentos con la misma
// altura en la página forman una línea, ordenados de izquierda a derecha).
// Devuelve "" si el PDF no lleva texto (escaneado o foto).
export async function extractPdfText(data, maxPages = 5) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  try {
    const out = [];
    for (let p = 1; p <= Math.min(pdf.numPages, maxPages); p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const rows = [];
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const [, , , , x, y] = item.transform;
        // Misma línea si la altura difiere menos de 3 unidades
        let row = rows.find((r) => Math.abs(r.y - y) < 3);
        if (!row) {
          row = { y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, str: item.str });
      }
      rows
        .sort((a, b) => b.y - a.y) // de arriba abajo
        .forEach((r) =>
          out.push(
            r.parts
              .sort((a, b) => a.x - b.x)
              .map((part) => part.str)
              .join(" ")
          )
        );
    }
    return out.join("\n");
  } finally {
    pdf.destroy();
  }
}
