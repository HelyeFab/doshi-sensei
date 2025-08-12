'use client';

import * as React from "react";
import { X, CheckCircle, AlertCircle, Info, Wifi, WifiOff, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface EnhancedToastProps {
  id: string;
  title?: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info" | "connection" | "offline" | "update";
  duration?: number;
  style?: "toast" | "modal"; // toast = corner, modal = centered
  actions?: ToastAction[];
  persistent?: boolean; // Don't auto-dismiss if true
  onClose?: () => void;
}

export function EnhancedToast({
  id,
  title,
  description,
  type = "info",
  duration = 5000,
  style = "toast",
  actions,
  persistent = false,
  onClose,
}: EnhancedToastProps) {
  React.useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, persistent, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
      case "offline":
        return <WifiOff className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "connection":
        return <Wifi className="w-5 h-5" />;
      case "update":
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case "success":
      case "connection":
        return "bg-green-600 dark:bg-green-500 text-white border-green-700 dark:border-green-400";
      case "error":
      case "offline":
        return "bg-red-600 dark:bg-red-500 text-white border-red-700 dark:border-red-400";
      case "warning":
        return "bg-amber-600 dark:bg-amber-500 text-white border-amber-700 dark:border-amber-400";
      case "update":
        return "bg-blue-600 dark:bg-blue-500 text-white border-blue-700 dark:border-blue-400";
      default:
        return "bg-primary text-primary-foreground border-primary/20";
    }
  };

  const getPositionStyles = () => {
    if (style === "modal") {
      return "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]";
    }
    return "fixed top-4 right-4 z-[9999]";
  };

  const getAnimationProps = () => {
    if (style === "modal") {
      return {
        initial: { scale: 0.9, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.9, opacity: 0 },
        transition: { type: 'spring', damping: 25, stiffness: 300 }
      };
    }
    return {
      initial: { x: 100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: 100, opacity: 0 },
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    };
  };

  const content = (
    <motion.div
      {...getAnimationProps()}
      className={getPositionStyles()}
    >
      <div 
        className={`
          ${style === 'modal' ? 'min-w-[320px] max-w-[90vw]' : 'min-w-80 max-w-md'}
          rounded-xl shadow-2xl border backdrop-blur-md
          ${getStyles()}
        `}
      >
        {style === 'modal' ? (
          // Modal-style layout (centered, for connection status)
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="p-3 bg-white/10 dark:bg-white/20 rounded-full backdrop-blur-sm">
              {getIcon()}
            </div>
            <div className="text-center">
              {title && <p className="font-semibold text-lg mb-1">{title}</p>}
              {description && <p className="text-sm opacity-90">{description}</p>}
            </div>
            {actions && actions.length > 0 && (
              <div className="flex gap-2 mt-2">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-all
                      ${action.variant === 'secondary' 
                        ? 'bg-white/10 hover:bg-white/20 text-white' 
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            {type === 'offline' && (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-current rounded-full opacity-60"></div>
              </div>
            )}
          </div>
        ) : (
          // Toast-style layout (corner, for updates/installs)
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 rounded-full bg-white/10 dark:bg-white/20">
                {getIcon()}
              </div>
              <div className="flex-1">
                {title && <div className="font-semibold text-sm">{title}</div>}
                {description && (
                  <div className="text-sm opacity-90 mt-1">{description}</div>
                )}
                {actions && actions.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={action.onClick}
                        className={`
                          px-3 py-1.5 rounded-md font-medium text-xs transition-all
                          ${action.variant === 'secondary' 
                            ? 'bg-white/10 hover:bg-white/20 text-white' 
                            : 'bg-white text-gray-900 hover:bg-gray-100'
                          }
                        `}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return content;
}

export interface EnhancedToastContextType {
  showToast: (toast: Omit<EnhancedToastProps, "id" | "onClose">) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const EnhancedToastContext = React.createContext<EnhancedToastContextType | undefined>(
  undefined
);

export function EnhancedToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<EnhancedToastProps[]>([]);

  const showToast = React.useCallback(
    (toast: Omit<EnhancedToastProps, "id" | "onClose">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: EnhancedToastProps = {
        ...toast,
        id,
        onClose: () => hideToast(id),
      };
      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const hideToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const hideAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <EnhancedToastContext.Provider value={{ showToast, hideToast, hideAllToasts }}>
      {children}
      <AnimatePresence>
        {toasts.map((toast) => (
          <EnhancedToast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
      {/* Backdrop for modal-style toasts */}
      <AnimatePresence>
        {toasts.some(t => t.style === 'modal') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
            onClick={() => {
              // Close modal-style toasts when clicking backdrop
              const modalToasts = toasts.filter(t => t.style === 'modal');
              modalToasts.forEach(t => t.onClose?.());
            }}
          />
        )}
      </AnimatePresence>
    </EnhancedToastContext.Provider>
  );
}

export function useEnhancedToast() {
  const context = React.useContext(EnhancedToastContext);
  if (!context) {
    throw new Error("useEnhancedToast must be used within an EnhancedToastProvider");
  }
  return context;
}