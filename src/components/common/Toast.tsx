// src/components/common/Toast.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  MdCheckCircle,
  MdError,
  MdWarning,
  MdInfo,
  MdClose,
} from "react-icons/md";
import type { ToastType } from "../../store/useAppStore";

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onDismiss: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: MdCheckCircle,
    bgClass: "bg-green-600 dark:bg-green-500",
    borderClass: "border-green-700 dark:border-green-400",
  },
  error: {
    icon: MdError,
    bgClass: "bg-red-600 dark:bg-red-500",
    borderClass: "border-red-700 dark:border-red-400",
  },
  warning: {
    icon: MdWarning,
    bgClass: "bg-yellow-500 dark:bg-yellow-500",
    borderClass: "border-yellow-600 dark:border-yellow-400",
  },
  info: {
    icon: MdInfo,
    bgClass: "bg-blue-600 dark:bg-blue-500",
    borderClass: "border-blue-700 dark:border-blue-400",
  },
};

const Toast: React.FC<ToastProps> = ({ id, message, type, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const config = typeConfig[type];
  const Icon = config.icon;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300); // Match duration-300 CSS transition
  }, [id, onDismiss]);

  // Trigger enter animation on mount
  useEffect(() => {
    const enterTimer = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(enterTimer);
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [handleDismiss]);

  return (
    <div
      role="alert"
      onClick={handleDismiss}
      className={`
        flex items-center gap-3 p-4 rounded-lg shadow-lg border cursor-pointer
        text-white min-w-[280px] max-w-[360px]
        transition-all duration-300 ease-out
        ${config.bgClass} ${config.borderClass}
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <Icon className="text-2xl flex-shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="p-1 rounded-full hover:bg-white/20 transition-colors duration-200"
        aria-label="Dismiss notification"
      >
        <MdClose className="text-lg" />
      </button>
    </div>
  );
};

export default Toast;
