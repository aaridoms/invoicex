"use client";

import { ROLE_LABEL } from "@/lib/roles";
import { getSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "../SessionProvider";
import { Button, Card, Field, Input, Toast } from "../ui";

const PROVIDER_LABEL = { email: "Email y contraseña", google: "Google" };

const callbackUrl = (next) =>
  `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

export default function AccountSettings() {
  const router = useRouter();
  const { user, org, role } = useSession();
  const [name, setName] = useState(user.name || "");
  const [savedName, setSavedName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [identities, setIdentities] = useState(null);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const notify = (message, type = "success", ms = 4500) => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), ms);
  };

  const loadIdentities = useCallback(async () => {
    const { data, error } = await getSupabase().auth.getUserIdentities();
    setIdentities(error ? [] : data.identities);
  }, []);

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  // Ejecuta una acción de cuenta mostrando su estado en el botón
  const run = async (key, fn) => {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      console.error(`Cuenta (${key}):`, err);
      notify(err?.message || "No se pudo completar la operación", "error", 6000);
    } finally {
      setBusy("");
    }
  };

  const saveName = (e) => {
    e.preventDefault();
    run("name", async () => {
      const { error } = await getSupabase().auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (error) throw error;
      setSavedName(name.trim());
      router.refresh();
      notify("Nombre guardado");
    });
  };

  const changeEmail = (e) => {
    e.preventDefault();
    if (email.trim() === user.email) return;
    run("email", async () => {
      const { error } = await getSupabase().auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: callbackUrl("/settings/account") }
      );
      if (error) throw error;
      notify(
        "Te hemos enviado un enlace de confirmación. El email cambiará cuando lo confirmes.",
        "success",
        8000
      );
    });
  };

  const changePassword = (e) => {
    e.preventDefault();
    if (password.length < 8) {
      notify("La contraseña debe tener al menos 8 caracteres.", "warning");
      return;
    }
    if (password !== password2) {
      notify("Las contraseñas no coinciden.", "warning");
      return;
    }
    run("password", async () => {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setPassword2("");
      notify("Contraseña actualizada");
      loadIdentities();
    });
  };

  const linkGoogle = () =>
    run("link", async () => {
      const { error } = await getSupabase().auth.linkIdentity({
        provider: "google",
        options: { redirectTo: callbackUrl("/settings/account") },
      });
      if (error) {
        throw new Error(
          /manual linking/i.test(error.message)
            ? "Activa «Manual linking» en Supabase → Authentication → Sign In / Providers para poder vincular Google."
            : error.message
        );
      }
    });

  const unlink = (identity) =>
    run(`unlink-${identity.identity_id}`, async () => {
      const label = PROVIDER_LABEL[identity.provider] || identity.provider;
      if (!window.confirm(`¿Dejar de entrar con ${label}?`)) return;
      const { error } = await getSupabase().auth.unlinkIdentity(identity);
      if (error) throw error;
      notify(`${label} desvinculado`);
      loadIdentities();
    });

  const signOutEverywhere = () =>
    run("global", async () => {
      if (
        !window.confirm(
          "Se cerrará la sesión en todos tus dispositivos, también en este. ¿Continuar?"
        )
      ) {
        return;
      }
      await getSupabase().auth.signOut({ scope: "global" });
      router.replace("/login");
      router.refresh();
    });

  const hasGoogle = identities?.some((i) => i.provider === "google");

  return (
    <div className="grid max-w-5xl items-start gap-5 grid-cols-2">
      <div className="space-y-5">
        <Card title="Perfil">
          <form onSubmit={saveName} className="space-y-3">
            <Field label="Nombre" htmlFor="fullName">
              <Input
                id="fullName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={name.trim() === savedName || busy === "name"}
              >
                Guardar nombre
              </Button>
            </div>
          </form>
          <form onSubmit={changeEmail} className="mt-5 space-y-3 border-t border-border pt-5">
            <Field
              label="Email"
              htmlFor="email"
              hint="Al cambiarlo te enviaremos un enlace para confirmarlo."
            >
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={!email.trim() || email.trim() === user.email || busy === "email"}
              >
                Cambiar email
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Negocio">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Negocio</dt>
              <dd>{org.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tu rol</dt>
              <dd>{ROLE_LABEL[role] || role}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="space-y-5">
        <Card
          title="Contraseña"
          description="Si entras con Google, aquí puedes crear también una contraseña."
        >
          <form onSubmit={changePassword} className="space-y-3">
            <Field label="Nueva contraseña" htmlFor="newPassword" hint="Mínimo 8 caracteres.">
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Repite la contraseña" htmlFor="newPassword2">
              <Input
                id="newPassword2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={!password || busy === "password"}>
                Actualizar contraseña
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Métodos de acceso">
          {identities === null ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : (
            <ul className="space-y-2">
              {identities.map((i) => (
                <li
                  key={i.identity_id}
                  className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <span>
                    {PROVIDER_LABEL[i.provider] || i.provider}
                    {i.identity_data?.email ? (
                      <span className="ml-2 text-xs text-muted">{i.identity_data.email}</span>
                    ) : null}
                  </span>
                  {identities.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unlink(i)}
                      disabled={busy === `unlink-${i.identity_id}`}
                    >
                      Desvincular
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {identities && !hasGoogle ? (
            <Button size="sm" className="mt-3" onClick={linkGoogle} disabled={busy === "link"}>
              Vincular Google
            </Button>
          ) : null}
        </Card>

        <Card title="Sesiones">
          <p className="text-sm text-muted">
            Si has entrado desde un ordenador que no es tuyo o has perdido un
            dispositivo, cierra la sesión en todos a la vez.
          </p>
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={signOutEverywhere}
            disabled={busy === "global"}
          >
            Cerrar sesión en todos los dispositivos
          </Button>
        </Card>
      </div>

      {toast ? <Toast message={toast.message} type={toast.type} /> : null}
    </div>
  );
}
