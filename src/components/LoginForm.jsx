"use client";

import { getSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthShell from "./AuthShell";
import { Button, Field, Input } from "./ui";

const MODES = {
  signin: {
    title: "Entrar",
    description: "Accede a las facturas de tu negocio.",
    submit: "Entrar",
  },
  signup: {
    title: "Crear cuenta",
    description: "Empieza a facturar en un par de minutos.",
    submit: "Crear cuenta",
  },
  reset: {
    title: "Recuperar contraseña",
    description: "Te enviaremos un enlace para elegir una nueva.",
    submit: "Enviar enlace",
  },
};

// Mensajes de Supabase traducidos para el usuario
function friendlyError(error) {
  const msg = error?.message || "";
  if (/invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(msg))
    return "Confirma tu email antes de entrar (revisa tu bandeja de entrada).";
  if (/already registered|already exists/i.test(msg))
    return "Ya existe una cuenta con ese email. Prueba a entrar.";
  if (/password should be at least/i.test(msg))
    return "La contraseña debe tener al menos 8 caracteres.";
  if (/rate limit|too many/i.test(msg))
    return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export default function LoginForm({ next = "/", authError = false }) {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    authError ? "El enlace no es válido o ha caducado. Vuelve a intentarlo." : ""
  );
  const [info, setInfo] = useState("");

  const callbackUrl = (to = next) =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  const switchMode = (m) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    const supabase = getSupabase();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        if (password.length < 8) {
          setError("La contraseña debe tener al menos 8 caracteres.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl("/onboarding") },
        });
        if (error) throw error;
        if (data.session) {
          // Proyecto sin confirmación de email: ya hay sesión
          router.replace("/onboarding");
          router.refresh();
        } else {
          setInfo("Te hemos enviado un email para confirmar la cuenta.");
        }
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: callbackUrl("/auth/update-password"),
      });
      if (error) throw error;
      setInfo("Si existe una cuenta con ese email, recibirás un enlace.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setError(friendlyError(error));
      setBusy(false);
    }
  };

  const { title, description, submit } = MODES[mode];

  return (
    <AuthShell title={title} description={description}>
      {mode !== "reset" ? (
        <>
          <Button
            className="w-full justify-center"
            onClick={handleGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />o con tu email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {mode !== "reset" ? (
          <Field
            label="Contraseña"
            htmlFor="password"
            hint={mode === "signup" ? "Mínimo 8 caracteres." : undefined}
          >
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {info ? <p className="text-sm text-accent">{info}</p> : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          disabled={busy}
        >
          {busy ? "Un momento…" : submit}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-1.5 text-xs text-muted">
        {mode === "signin" ? (
          <>
            <button type="button" onClick={() => switchMode("reset")} className="hover:text-fg">
              ¿Has olvidado la contraseña?
            </button>
            <p>
              ¿No tienes cuenta?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="text-accent hover:underline">
                Crear una
              </button>
            </p>
          </>
        ) : (
          <button type="button" onClick={() => switchMode("signin")} className="hover:text-fg">
            Volver a entrar con mi cuenta
          </button>
        )}
      </div>
    </AuthShell>
  );
}
