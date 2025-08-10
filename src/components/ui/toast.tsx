import * as React from "react";
import { X, CheckCircle, AlertCircle, Info, Wifi, WifiOff } from "lucide-react";

export interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info" | "connection";
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  id,
  title,
  description,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-white" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-white" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-white" />;
      case "connection":
        return <Wifi className="w-5 h-5 text-white" />;
      default:
        return <Info className="w-5 h-5 text-white" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
      case "connection":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  return (
    <div
      className={`
      fixed top-4 right-4 z-50 min-w-80 max-w-md p-4 rounded-lg shadow-lg
      transform transition-all duration-300 ease-in-out
      animate-in slide-in-from-right-full
      ${getStyles()}
    `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          {title && <div className="font-semibold text-sm">{title}</div>}
          {description && (
            <div className="text-sm opacity-90 mt-1">{description}</div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export interface ToastContextType {
  showToast: (toast: Omit<ToastProps, "id" | "onClose">) => void;
  hideToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const showToast = React.useCallback(
    (toast: Omit<ToastProps, "id" | "onClose">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastProps = {
        ...toast,
        id,
        onClose: () => hideToast(id),
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const hideToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
