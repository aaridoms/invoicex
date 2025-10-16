const variants = {
  success: {
    icon: "check",
    text: "text-green-400",
    bg: "bg-green-500/15",
    ring: "ring-green-500/20",
  },
  error: {
    icon: "x",
    text: "text-red-400",
    bg: "bg-red-500/15",
    ring: "ring-red-500/20",
  },
  warning: {
    icon: "warn",
    text: "text-amber-400",
    bg: "bg-amber-500/15",
    ring: "ring-amber-500/20",
  },
  info: {
    icon: "info",
    text: "text-blue-400",
    bg: "bg-blue-500/15",
    ring: "ring-blue-500/20",
  },
};

const Icon = ({ kind }) => {
  const base = "w-5 h-5";
  switch (kind) {
    case "check":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "x":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case "warn":
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v4m0 4h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case "info":
    default:
      return (
        <svg
          className={base}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4m0-4h.01" />
        </svg>
      );
  }
};

const Toast = ({ message, type = "success", onClose }) => {
  const variant = variants[type] || variants.info;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm w-full"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`relative flex items-start gap-3 rounded-xl border p-4 pr-10 shadow-lg backdrop-blur bg-white/90 border-gray-200 text-gray-800 dark:bg-zinc-900/70 dark:border-white/10 dark:text-gray-100`}
      >
        {/* Anillo/acento sutil */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-xl ring-1 ${variant.ring}`}
        />

        {/* Icono */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${variant.bg} ${variant.text}`}
        >
          <Icon kind={variant.icon} />
        </div>

        {/* Mensaje */}
        <div className="flex-1 text-sm leading-6">
          <p>{message}</p>
        </div>

        {/* Botón de cerrar (opcional) */}
        {onClose && (
          <button
            className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            onClick={onClose}
            aria-label="Cerrar notificación"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Toast;
