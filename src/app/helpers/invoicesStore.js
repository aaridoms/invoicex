// Simple IndexedDB store for invoices (no external deps)
// Record shape: { id, filename, createdAt, meta: {...}, blob }

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

export async function saveInvoice({ id, filename, meta, blob }) {
  try {
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
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Silenciar error si el usuario está en SSR o navegador sin soporte
    console.warn("No se pudo guardar la factura en IndexedDB:", e);
    return false;
  }
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
