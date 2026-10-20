// Pantalla que se muestra si faltan las variables de entorno de Supabase
export default function SetupNotice() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-lg rounded-xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold">Falta configurar Supabase</h1>
        <p className="mt-2 text-sm text-muted">
          Crea un archivo <code className="text-fg">.env.local</code> en la raíz
          del proyecto con estas dos variables y reinicia{" "}
          <code className="text-fg">pnpm dev</code>:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-bg p-3 text-xs text-fg">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
        </pre>
        <p className="mt-4 text-sm text-muted">
          Los pasos completos están en <code className="text-fg">SUPABASE.md</code>.
        </p>
      </div>
    </div>
  );
}
