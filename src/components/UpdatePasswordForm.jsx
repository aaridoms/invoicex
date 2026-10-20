"use client";

import { getSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "./AuthShell";
import { Button, Field, Input } from "./ui";

// Se llega aquí desde el enlace del email de recuperar contraseña
export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(
        /session/i.test(error.message)
          ? "El enlace ha caducado. Pide uno nuevo desde la pantalla de entrar."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo."
      );
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <AuthShell title="Nueva contraseña" description="Elige la contraseña con la que entrarás a partir de ahora.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Contraseña nueva" htmlFor="password" hint="Mínimo 8 caracteres.">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" variant="primary" className="w-full justify-center" disabled={busy}>
          {busy ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
      <p className="mt-5 text-center text-xs text-muted">
        <Link href="/login" className="hover:text-fg">
          Volver a entrar
        </Link>
      </p>
    </AuthShell>
  );
}
