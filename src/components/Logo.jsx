// Logo de InvoiceX: una hoja de factura con la esquina doblada y una X.
// Los colores salen de los tokens del tema (--accent, --accent-fg).

export function LogoMark({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="32" height="32" rx="8" fill="rgb(var(--accent))" />
      {/* Hoja */}
      <path
        d="M10 6.5h8.6L24 11.9V24a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2z"
        fill="rgb(var(--accent-fg))"
      />
      {/* Esquina doblada */}
      <path
        d="M18.6 6.5V10.4a1.5 1.5 0 0 0 1.5 1.5H24z"
        fill="rgb(var(--accent))"
        opacity="0.55"
      />
      {/* X */}
      <path
        d="M12.6 15.2l6.8 6.8M19.4 15.2l-6.8 6.8"
        stroke="rgb(var(--accent))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight">
        Invoice<span className="text-accent">X</span>
      </span>
    </span>
  );
}
