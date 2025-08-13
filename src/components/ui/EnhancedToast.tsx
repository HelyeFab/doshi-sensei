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
  type?: "success" | "error" | "warning" | "info" | "connection" | "offline" | "update" | "install";
  duration?: number;
  style?: "toast" | "modal" | "banner-top" | "banner-bottom";
  actions?: ToastAction[];
  persistent?: boolean;
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
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        return <AlertCircle className="w-5 h-5" />;
      case "offline":
        return <WifiOff className="w-5 h-5" />;
      case "warning":
        return <AlertCircle className="w-5 h-5" />;
      case "connection":
        return <Wifi className="w-5 h-5" />;
      case "update":
        return <RefreshCw className="w-5 h-5" />;
      case "install":
        return <Download className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getAnimationProps = () => {
    switch (style) {
      case "modal":
        return {
          initial: { scale: 0.9, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.9, opacity: 0 },
          transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
        };
      case "banner-top":
        return {
          initial: { y: -100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -100, opacity: 0 },
          transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
        };
      case "banner-bottom":
        return {
          initial: { y: 100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 100, opacity: 0 },
          transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
        };
      case "toast":
      default:
        return {
          initial: { x: 100, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: 100, opacity: 0 },
          transition: { type: 'spring' as const, damping: 25, stiffness: 300 }
        };
    }
  };

  // Completely custom inline styles to avoid any CSS conflicts
  const getContainerStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9999,
    };

    switch (style) {
      case "modal":
        return {
          ...baseStyle,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case "banner-top":
        return {
          ...baseStyle,
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
        };
      case "banner-bottom":
        return {
          ...baseStyle,
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
        };
      case "toast":
      default:
        return {
          ...baseStyle,
          top: '16px',
          right: '16px',
        };
    }
  };

  const getContentStyle = (): React.CSSProperties => {
    // Get background color based on type - using pastel theme-dependent colors
    let backgroundColor = '#ffffff';
    let textColor = '#000000';
    let borderColor = 'transparent';
    
    switch (type) {
      case "offline":
      case "error":
        // Pastel red with theme awareness
        backgroundColor = 'hsl(var(--destructive-hue, 0) 70% 95%)'; // Light pastel red background
        textColor = 'hsl(var(--destructive-hue, 0) 70% 30%)'; // Dark red text
        borderColor = 'hsl(var(--destructive-hue, 0) 60% 85%)'; // Soft red border
        break;
      case "connection":
      case "success":
        // Pastel green with theme awareness
        backgroundColor = 'hsl(142 70% 95%)'; // Light pastel green background
        textColor = 'hsl(142 70% 25%)'; // Dark green text
        borderColor = 'hsl(142 60% 85%)'; // Soft green border
        break;
      case "warning":
        // Pastel amber with theme awareness
        backgroundColor = 'hsl(43 90% 94%)'; // Light pastel amber background
        textColor = 'hsl(43 90% 30%)'; // Dark amber text
        borderColor = 'hsl(43 80% 85%)'; // Soft amber border
        break;
      case "update":
        // Pastel blue with theme awareness
        backgroundColor = 'hsl(var(--primary-hue, 221) 60% 95%)'; // Light pastel blue background
        textColor = 'hsl(var(--primary-hue, 221) 60% 30%)'; // Dark blue text
        borderColor = 'hsl(var(--primary-hue, 221) 50% 85%)'; // Soft blue border
        break;
      case "install":
        // Pastel purple with theme awareness
        backgroundColor = 'hsl(var(--primary-hue, 271) 60% 95%)'; // Light pastel purple background
        textColor = 'hsl(var(--primary-hue, 271) 60% 30%)'; // Dark purple text
        borderColor = 'hsl(var(--primary-hue, 271) 50% 85%)'; // Soft purple border
        break;
      default:
        backgroundColor = 'var(--card)';
        textColor = 'var(--card-foreground)';
        borderColor = 'var(--border)';
        break;
    }

    const baseStyle: React.CSSProperties = {
      backgroundColor,
      color: textColor,
      border: `1px solid ${borderColor}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      overflow: 'hidden',
    };

    if (style === 'modal') {
      return {
        ...baseStyle,
        minWidth: '320px',
        maxWidth: '90vw',
        borderRadius: '12px',
        padding: '24px',
      };
    } else if (style === 'banner-top' || style === 'banner-bottom') {
      // Responsive padding and height based on actual window width
      const isMobile = windowWidth < 640;
      const isTablet = windowWidth >= 640 && windowWidth < 1024;
      
      return {
        ...baseStyle,
        width: '100%',
        borderRadius: 0,
        padding: isMobile ? '14px 16px' : isTablet ? '16px 20px' : '18px 24px',
        minHeight: isMobile ? '72px' : isTablet ? '80px' : '88px',
        maxHeight: isMobile ? '88px' : isTablet ? '96px' : '104px',
        display: 'flex',
        alignItems: 'center',
      };
    } else {
      return {
        ...baseStyle,
        minWidth: '320px',
        maxWidth: '448px',
        borderRadius: '12px',
        padding: '16px',
      };
    }
  };

  const getBannerContentStyle = (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    maxWidth: '1024px',
    margin: '0 auto',
    width: '100%',
    position: 'relative' as const,
    paddingRight: '48px', // Space for X button
  });

  const getIconStyle = (): React.CSSProperties => {
    const isMobile = windowWidth < 640;
    
    // Match icon background to notification type with subtle opacity
    let iconBg = 'rgba(0, 0, 0, 0.05)';
    switch (type) {
      case "offline":
      case "error":
        iconBg = 'hsl(var(--destructive-hue, 0) 70% 90% / 0.5)'; // Slightly darker red
        break;
      case "connection":
      case "success":
        iconBg = 'hsl(142 70% 90% / 0.5)'; // Slightly darker green
        break;
      case "warning":
        iconBg = 'hsl(43 90% 88% / 0.5)'; // Slightly darker amber
        break;
      case "update":
        iconBg = 'hsl(var(--primary-hue, 221) 60% 90% / 0.5)'; // Slightly darker blue
        break;
      case "install":
        iconBg = 'hsl(var(--primary-hue, 271) 60% 90% / 0.5)'; // Slightly darker purple
        break;
    }
    
    return {
      width: isMobile ? '28px' : '32px',
      height: isMobile ? '28px' : '32px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: iconBg,
      flexShrink: 0,
    };
  };

  const getTextContainerStyle = (): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  });

  const getTitleStyle = (): React.CSSProperties => {
    const isMobile = windowWidth < 640;
    return {
      fontSize: isMobile ? '14px' : '15px',
      fontWeight: 600,
      lineHeight: '1.2',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    };
  };

  const getDescriptionStyle = (): React.CSSProperties => {
    const isMobile = windowWidth < 640;
    return {
      fontSize: isMobile ? '12px' : '13px',
      opacity: 0.85,
      lineHeight: '1.2',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    };
  };

  const getCloseButtonStyle = (): React.CSSProperties => {
    // Use darker version of the text color for the X button
    let closeColor = 'var(--muted-foreground)';
    switch (type) {
      case "offline":
      case "error":
        closeColor = 'hsl(var(--destructive-hue, 0) 70% 40% / 0.6)';
        break;
      case "connection":
      case "success":
        closeColor = 'hsl(142 70% 35% / 0.6)';
        break;
      case "warning":
        closeColor = 'hsl(43 90% 40% / 0.6)';
        break;
      case "update":
        closeColor = 'hsl(var(--primary-hue, 221) 60% 40% / 0.6)';
        break;
      case "install":
        closeColor = 'hsl(var(--primary-hue, 271) 60% 40% / 0.6)';
        break;
    }
    
    return {
      position: 'absolute' as const,
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '24px',
      height: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      background: 'transparent',
      border: 'none',
      color: closeColor,
      transition: 'opacity 0.2s',
    };
  };

  const getActionButtonStyle = (variant?: 'primary' | 'secondary'): React.CSSProperties => {
    let buttonBg = 'rgba(0, 0, 0, 0.1)';
    let buttonColor = 'currentColor';
    let buttonBorder = 'transparent';
    
    if (variant === 'primary') {
      // Primary button gets a darker shade of the notification color
      switch (type) {
        case "update":
          buttonBg = 'hsl(var(--primary-hue, 221) 60% 85%)';
          buttonColor = 'hsl(var(--primary-hue, 221) 60% 25%)';
          buttonBorder = 'hsl(var(--primary-hue, 221) 60% 75%)';
          break;
        case "install":
          buttonBg = 'hsl(var(--primary-hue, 271) 60% 85%)';
          buttonColor = 'hsl(var(--primary-hue, 271) 60% 25%)';
          buttonBorder = 'hsl(var(--primary-hue, 271) 60% 75%)';
          break;
        default:
          buttonBg = 'rgba(0, 0, 0, 0.08)';
          buttonColor = 'currentColor';
      }
    } else {
      // Secondary button is more subtle
      buttonBg = 'rgba(0, 0, 0, 0.03)';
      buttonBorder = 'currentColor';
    }
    
    return {
      padding: '6px 14px',
      fontSize: '13px',
      borderRadius: '6px',
      fontWeight: 500,
      cursor: 'pointer',
      border: variant === 'secondary' ? `1px solid ${buttonBorder}` : 'none',
      whiteSpace: 'nowrap' as const,
      backgroundColor: buttonBg,
      color: buttonColor,
      transition: 'all 0.2s',
      opacity: variant === 'secondary' ? 0.7 : 1,
    };
  };

  // Render banner layout
  if (style === 'banner-top' || style === 'banner-bottom') {
    return (
      <motion.div
        key={`${id}-${style}-${type}`}
        {...getAnimationProps()}
        style={getContainerStyle()}
      >
        <div style={getContentStyle()}>
          <div style={getBannerContentStyle()}>
            <div style={getIconStyle()}>
              {getIcon()}
            </div>
            <div style={getTextContainerStyle()}>
              {title && <div style={getTitleStyle()}>{title}</div>}
              {description && <div style={getDescriptionStyle()}>{description}</div>}
            </div>
            {actions && actions.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    style={getActionButtonStyle(action.variant)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              style={getCloseButtonStyle()}
              aria-label="Dismiss"
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Render modal or toast layout (existing code for those)
  return (
    <motion.div
      key={`${id}-${style}-${type}`}
      {...getAnimationProps()}
      style={getContainerStyle()}
    >
      <div style={getContentStyle()}>
        {/* Modal and toast content here - keeping simple for now */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={getIconStyle()}>
            {getIcon()}
          </div>
          <div style={{ flex: 1 }}>
            {title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>}
            {description && <div style={{ fontSize: '14px', opacity: 0.9 }}>{description}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              ...getCloseButtonStyle(),
              position: 'static' as const,
              transform: 'none',
            }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {actions && actions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                style={getActionButtonStyle(action.variant)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
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
      const id = Math.random().toString(36).substring(2, 11);
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
      {/* Backdrop for modal-style toasts only */}
      <AnimatePresence>
        {toasts.some(t => t.style === 'modal') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(4px)',
            }}
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