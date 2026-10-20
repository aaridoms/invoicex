"use client";

import { deleteAccount, deleteOrganization, exportOrgArchive } from "@/lib/data/export";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconDownload, IconTrash } from "../icons";
import { useSession } from "../SessionProvider";
import { Button, Card, Field, Input, Toast } from "../ui";

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const slug = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "negocio";

// Confirmación escribiendo un texto: para acciones que no se pueden deshacer
function ConfirmByTyping({ expected, label, onConfirm, busy, children }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <IconTrash className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-danger/30 bg-danger/5 p-4">
      {children}
      <Field
        label={`Escribe «${expected}» para confirmar`}
        htmlFor={`confirm-${label}`}
        className="mt-3"
      >
        <Input
          id={`confirm-${label}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
      </Field>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setValue(""); }}>
          Cancelar
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={value.trim() !== expected || busy}
          onClick={onConfirm}
        >
          {busy ? "Eliminando…" : label}
        </Button>
      </div>
    </div>
  );
}

export default function DataSettings() {
  const router = useRouter();
  const { org, role, issuers } = useSession();
  const isOwner = role === "owner";
  const [progress, setProgress] = useState(null); // { done, total } durante la exportación
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = (message, type = "success", ms = 5000) => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const handleExport = async () => {
    setBusy("export");
    setProgress({ done: 0, total: 0 });
    try {
      const blob = await exportOrgArchive({ org, issuers }, (done, total) =>
        setProgress({ done, total })
      );
      saveBlob(blob, `invoicex-${slug(org.name)}-${new Date().toISOString().slice(0, 10)}.zip`);
      notify("Copia descargada");
    } catch (err) {
      console.error("Exportar:", err);
      notify("No se pudo generar la copia. Inténtalo de nuevo.", "error");
    } finally {
      setBusy("");
      setProgress(null);
    }
  };

  const handleDeleteOrg = async () => {
    setBusy("org");
    try {
      await deleteOrganization(org.id);
      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      console.error("Eliminar negocio:", err);
      notify(err?.message || "No se pudo eliminar el negocio", "error");
      setBusy("");
    }
  };

  const handleDeleteAccount = async () => {
    setBusy("account");
    try {
      await deleteAccount({ orgId: org.id, isOwner });
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Eliminar cuenta:", err);
      notify(err?.message || "No se pudo eliminar la cuenta", "error");
      setBusy("");
    }
  };

  const legalNote = (
    <p className="text-sm text-muted">
      <strong className="text-fg">Antes, descarga una copia.</strong> La ley te
      obliga a conservar las facturas emitidas al menos 4 años (6 a efectos
      mercantiles). Esta acción no se puede deshacer.
    </p>
  );

  return (
    <div className="max-w-3xl space-y-5">
      <Card
        title="Exportar tus datos"
        description="Un archivo ZIP con todo lo de tu negocio, para guardarlo o dárselo a tu gestor."
      >
        <ul className="mb-4 space-y-1 text-sm text-muted">
          <li>
            <span className="text-fg">facturas_emitidas.csv</span>: libro de facturas
            emitidas (se abre con Excel).
          </li>
          <li>
            <span className="text-fg">pdfs/</span>: el PDF de cada factura.
          </li>
          <li>
            <span className="text-fg">datos.json</span>: todos los datos en formato
            estándar (portabilidad, RGPD).
          </li>
        </ul>
        <Button onClick={handleExport} disabled={busy === "export"}>
          <IconDownload />
          {progress
            ? progress.total
              ? `Descargando PDFs ${progress.done}/${progress.total}…`
              : "Preparando…"
            : "Descargar copia (ZIP)"}
        </Button>
      </Card>

      <Card
        title="Zona peligrosa"
        description="Acciones permanentes sobre tu negocio y tu cuenta."
        className="border-danger/30"
      >
        <div className="space-y-6">
          {isOwner ? (
            <div>
              <p className="text-sm font-medium">Eliminar el negocio</p>
              <p className="mb-3 mt-0.5 text-sm text-muted">
                Borra {org.name}, sus empresas, facturas y PDFs. Tu cuenta se mantiene
                y podrás dar de alta otro negocio.
              </p>
              <ConfirmByTyping
                expected={org.name}
                label="Eliminar negocio"
                onConfirm={handleDeleteOrg}
                busy={busy === "org"}
              >
                {legalNote}
              </ConfirmByTyping>
            </div>
          ) : null}

          <div className={isOwner ? "border-t border-border pt-6" : ""}>
            <p className="text-sm font-medium">Eliminar mi cuenta</p>
            <p className="mb-3 mt-0.5 text-sm text-muted">
              {isOwner
                ? `Borra tu usuario y también ${org.name} con todo su contenido, porque eres el dueño.`
                : "Borra tu usuario. Las facturas que creaste se conservan en el negocio."}
            </p>
            <ConfirmByTyping
              expected="ELIMINAR"
              label="Eliminar cuenta"
              onConfirm={handleDeleteAccount}
              busy={busy === "account"}
            >
              {legalNote}
            </ConfirmByTyping>
          </div>
        </div>
      </Card>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
