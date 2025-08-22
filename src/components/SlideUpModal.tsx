'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  height?: 'full' | 'auto' | '90%' | '80%' | '70%' | '60%' | '50%';
  /**
   * @deprecated Avoid using handles - they're a legacy mobile pattern.
   * Modern UX prefers clear close buttons and gestures without visual handles.
   * @default false
   */
  showHandle?: boolean;
  closeOnOutsideClick?: boolean;
  className?: string;
  useNewWrapper?: boolean;
  showCloseButton?: boolean;
}

export default function SlideUpModal({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  height = '90%',
  showHandle = false,
  closeOnOutsideClick = true,
  className = '',
  showCloseButton = true,
}: SlideUpModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleBackdropClick}
      style={{
        padding: '0 !important',
        margin: '0 !important',
      }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-xl transition-all duration-300 flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-[105%]'
        } ${className}`}
        style={{
          height: height === 'full' ? '100%' : height === 'auto' ? 'auto' : height,
          maxHeight: height === '90%' && typeof window !== 'undefined' && window.innerWidth < 768 ? '90vh' : '100vh',
          marginTop: height === '90%' && typeof window !== 'undefined' && window.innerWidth < 768 ? '10vh' : '0',
          visibility: isOpen ? 'visible' : 'hidden',
        }}
      >
        {/* Close button (always at top right) */}
        {showCloseButton && !title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-muted/80 hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5 text-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Handle */}
        {showHandle && (
          <div className="modal-handle flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl">
          <div className="px-3 sm:px-4 py-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}