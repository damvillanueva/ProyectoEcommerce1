import { useCallback, useRef, useState } from "react";

export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, tone = "info") => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((currentToasts) => [
        ...currentToasts,
        {
          id,
          message,
          tone,
        },
      ]);

      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  return {
    dismissToast,
    showToast,
    toasts,
  };
}
