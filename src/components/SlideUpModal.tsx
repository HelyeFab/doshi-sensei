'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: string;
  height?: 'full' | 'auto' | '90%' | '80%' | '70%' | '60%' | '50%';
  showHandle?: boolean;
  closeOnOutsideClick?: boolean;
  className?: string;
  useNewWrapper?: boolean;
}

export default function SlideUpModal({
  isOpen,
  onClose,
  children,
  title,
  height = '90%',
  showHandle = false,
  closeOnOutsideClick = true,
  className = '',
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
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${className}`}
        style={{
          height: height === 'full' ? '100%' : height === 'auto' ? 'auto' : height,
          maxHeight: '100vh',
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div className="modal-handle flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
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
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}