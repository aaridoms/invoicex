// Esqueleto que Next muestra al instante al cambiar de apartado, mientras
// llega la página nueva (la barra lateral del layout se mantiene). También
// permite a Next precargar los apartados al pasar por los enlaces.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-8 py-7" aria-busy="true">
      <span className="sr-only">Cargando…</span>
      <div className="mb-6 h-7 w-48 rounded-md bg-surface-2" />
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[92px] rounded-xl border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 h-72 rounded-xl border border-border bg-surface" />
        <div className="h-72 rounded-xl border border-border bg-surface" />
      </div>
    </div>
  );
}
