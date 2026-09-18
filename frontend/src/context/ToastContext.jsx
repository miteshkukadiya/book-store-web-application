import React, { createContext, useContext, useState, useCallback } from "react";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from "react-icons/fa";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getBgColor = (type) => {
    switch (type) {
      case "error":
        return "bg-red-900/90 border-red-500 text-red-100";
      case "info":
        return "bg-blue-900/90 border-blue-500 text-blue-100";
      case "warning":
        return "bg-yellow-900/90 border-yellow-500 text-yellow-100";
      case "success":
      default:
        return "bg-emerald-900/90 border-emerald-500 text-emerald-100";
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "error":
        return <FaExclamationCircle className="text-red-400 text-xl flex-shrink-0" />;
      case "info":
        return <FaInfoCircle className="text-blue-400 text-xl flex-shrink-0" />;
      case "warning":
        return <FaExclamationCircle className="text-yellow-400 text-xl flex-shrink-0" />;
      case "success":
      default:
        return <FaCheckCircle className="text-emerald-400 text-xl flex-shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 ${getBgColor(toast.type)}`}
          >
            <div className="flex items-center gap-3">
              {getIcon(toast.type)}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              aria-label="Close"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg) => alert(msg),
    };
  }
  return context;
};
