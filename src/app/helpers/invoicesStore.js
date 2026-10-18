// Simple IndexedDB store for invoices (no external deps)
// Record shape: { id, filename, createdAt, meta: {...}, blob }

// Clave de sessionStorage con la que el historial pasa al editor una
// factura para duplicarla: { from: id, invoice }
export const DUPLICATE_KEY = "invoicex:duplicate";

const DB_NAME = "invoicex";
const DB_VERSION = 1;
const STORE_NAME = "invoices";

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("IndexedDB no disponible en este entorno"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Guarda una factura nueva. Usa `add` (no `put`) para que nunca se
// sobrescriba una factura existente con el mismo número.
export async function saveInvoice({ id, filename, meta, blob }) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const record = {
      id: String(id),
      filename,
      createdAt: Date.now(),
      meta,
      blob,
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(true);
    req.onerror = (event) => {
      event.preventDefault();
      if (req.error?.name === "ConstraintError") {
        reject(new Error(`Ya existe una factura con el número ${id}`));
      } else {
        reject(req.error);
      }
    };
  });
}

export async function invoiceExists(id) {
  return (await getInvoice(id)) !== null;
}

// Sugiere el siguiente número a partir de la última factura creada,
// conservando prefijo y ceros a la izquierda: "2026-0009" -> "2026-0010".
export async function suggestNextInvoiceNumber() {
  const items = await listInvoices();
  const year = new Date().getFullYear();
  if (items.length === 0) return `${year}-0001`;
  const used = new Set(items.map((it) => String(it.id)));
  const last = String(items[0].meta?.nFactura || items[0].id);
  const match = last.match(/^(.*?)(\d+)$/);
  if (!match) return `${last}-1`;
  const [, prefix, digits] = match;
  // Saltar números ya usados si el historial tiene huecos o está desordenado
  let n = Number(digits) + 1;
  const format = (num) => `${prefix}${String(num).padStart(digits.length, "0")}`;
  while (used.has(format(n))) n++;
  return format(n);
}

export async function getInvoice(id) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(String(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function listInvoices() {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || [])
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ blob, ...rest }) => rest);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteInvoice(id) {
  const db = await openDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(String(id));
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function downloadInvoice(id) {
  const rec = await getInvoice(id);
  if (!rec) return null;
  const { blob, filename } = rec;
  return { blob, filename: filename || `invoice_${id}.pdf` };
}

// --- Copia de seguridad -------------------------------------------------

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, type = "application/pdf") {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type });
}

// Devuelve todas las facturas (con su PDF en base64) listas para JSON
export async function exportAllInvoices() {
  const db = await openDB();
  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  return Promise.all(
    records.map(async ({ blob, ...rest }) => ({
      ...rest,
      pdfBase64: blob ? await blobToBase64(blob) : "",
    }))
  );
}

// Importa facturas de una copia. Las que ya existen (mismo número) se
// omiten para no sobrescribir nada. Devuelve { added, skipped }.
export async function importInvoices(records) {
  const db = await openDB();
  let added = 0;
  let skipped = 0;
  for (const { pdfBase64, ...rest } of records) {
    if (!rest?.id) {
      skipped++;
      continue;
    }
    const ok = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).add({
        ...rest,
        id: String(rest.id),
        blob: pdfBase64 ? base64ToBlob(pdfBase64) : null,
      });
      req.onsuccess = () => resolve(true);
      req.onerror = (event) => {
        event.preventDefault();
        if (req.error?.name === "ConstraintError") resolve(false);
        else reject(req.error);
      };
    });
    ok ? added++ : skipped++;
  }
  return { added, skipped };
}
