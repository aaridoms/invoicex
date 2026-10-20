// Componentes de interfaz compartidos (tema oscuro)

import Link from "next/link";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const BUTTON_VARIANTS = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent/90 disabled:bg-accent/50 font-semibold",
  secondary:
    "bg-surface-2 text-fg border border-border hover:bg-border/60 disabled:opacity-50",
  ghost: "text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-50",
  danger:
    "text-danger hover:bg-danger/10 border border-transparent hover:border-danger/30",
};

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

const buttonClasses = (variant, size, className) =>
  cx(
    "inline-flex items-center rounded-lg transition-colors disabled:cursor-not-allowed",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

// Enlace con aspecto de botón (para navegar; Button es para acciones)
export function ButtonLink({ variant = "secondary", size = "md", className, ...props }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

const CONTROL =
  "block w-full rounded-lg border border-border bg-bg/60 px-3 text-sm text-fg placeholder:text-muted/60 outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/20";

export function Input({ className, ...props }) {
  return <input className={cx(CONTROL, "h-9", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx(CONTROL, "h-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(CONTROL, "py-2 min-h-[72px] resize-y", className)}
      {...props}
    />
  );
}

export function Field({ label, htmlFor, hint, className, children }) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-muted/80">{hint}</p> : null}
    </div>
  );
}

export function Card({ title, description, actions, className, children }) {
  return (
    <section
      className={cx("rounded-xl border border-border bg-surface", className)}
    >
      {title ? (
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// Aviso flotante en la esquina inferior derecha
export function Toast({ message, type = "success" }) {
  if (!message) return null;
  const tone =
    type === "error"
      ? "border-danger/40 text-danger"
      : type === "warning"
        ? "border-warning/40 text-warning"
        : "border-accent/40 text-accent";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border bg-surface-2 px-4 py-3 text-sm shadow-2xl shadow-black/50",
        tone
      )}
    >
      {message}
    </div>
  );
}
