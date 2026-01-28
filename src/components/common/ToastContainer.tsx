// src/components/common/ToastContainer.tsx
import React, { useCallback } from "react";
import { createPortal } from "react-dom";
import useAppStore from "../../store/useAppStore";
import Toast from "./Toast";

const ToastContainer: React.FC = () => {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  const handleDismiss = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast]
  );

  if (toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[60] flex flex-col gap-3"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={handleDismiss}
        />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
