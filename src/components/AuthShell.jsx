import Logo from "./Logo";

// Marco centrado para login, registro y alta del negocio
export default function AuthShell({ title, description, children, wide = false }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 py-10">
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-sm"}`}>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
