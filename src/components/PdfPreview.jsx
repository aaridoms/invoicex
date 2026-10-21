"use client";

import { useEffect, useRef, useState } from "react";

// Renderiza el PDF en <canvas> con pdf.js en lugar de usar el visor del
// navegador: se actualiza sin parpadeos mientras se escribe.
//
// Rendimiento: el análisis del PDF (fuentes, imágenes del logo…) ocurre en
// un Web Worker, así que no bloquea el teclado. Si llegan cambios mientras
// se está pintando, solo se pinta la última versión.

import { loadPdfjs } from "@/lib/pdfjs";

async function renderPdf(data, width) {
  const pdfjs = await loadPdfjs();
  // getDocument se queda con el buffer, así que le pasamos una copia
  const pdf = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  try {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvases = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const scale = width / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: scale * dpr });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport })
        .promise;
      canvases.push(canvas);
    }
    return canvases;
  } finally {
    pdf.destroy();
  }
}

export default function PdfPreview({ data }) {
  const containerRef = useRef(null);
  const queued = useRef(null); // última petición pendiente { data, width }
  const busy = useRef(false);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(Math.round(el.clientWidth));
    const ro = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !width) return;
    queued.current = { data, width };
    if (busy.current) return; // el bucle en curso recogerá esta versión

    busy.current = true;
    (async () => {
      while (queued.current) {
        const job = queued.current;
        queued.current = null;
        try {
          const canvases = await renderPdf(job.data, job.width);
          // Si ya hay una versión más nueva esperando, no hace falta mostrar esta
          if (!queued.current) {
            containerRef.current?.replaceChildren(...canvases);
            setError(false);
          }
        } catch (err) {
          console.error("Vista previa PDF:", err);
          setError(true);
        }
      }
      busy.current = false;
    })();
  }, [data, width]);

  return (
    <div>
      <div
        ref={containerRef}
        aria-label="Vista previa de la factura"
        role="img"
        className="flex min-h-[200px] flex-col gap-4 [&>canvas]:block [&>canvas]:aspect-[210/297] [&>canvas]:w-full [&>canvas]:rounded-lg [&>canvas]:bg-white [&>canvas]:shadow-2xl [&>canvas]:shadow-black/40"
      />
      {error ? (
        <p className="mt-2 text-xs text-danger">
          No se pudo mostrar la vista previa. El PDF se generará igualmente.
        </p>
      ) : null}
    </div>
  );
}
