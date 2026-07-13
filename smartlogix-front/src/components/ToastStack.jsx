import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

const TOAST_STYLES = {
  success: {
    icon: FiCheckCircle,
    className: "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
  },
  error: {
    icon: FiAlertCircle,
    className: "border-red-300/35 bg-red-500/15 text-red-100",
  },
  info: {
    icon: FiInfo,
    className: "border-sky-300/30 bg-sky-500/15 text-sky-100",
  },
};

function ToastStack({ onDismiss, toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const toastStyle = TOAST_STYLES[toast.tone] || TOAST_STYLES.info;
        const Icon = toastStyle.icon;

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-md ${toastStyle.className}`}
          >
            <Icon className="mt-0.5 shrink-0 text-lg" />
            <p className="min-w-0 flex-1 text-sm font-black leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Cerrar notificacion"
              className="rounded-md p-1 text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <FiX />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastStack;
