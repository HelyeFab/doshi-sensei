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
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle clicks outside the modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle swipe down to close on mobile
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Only allow dragging from the handle or header area
      if (target.closest('.modal-handle') || target.closest('.modal-header')) {
        startY = e.touches[0].clientY;
        isDragging = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      
      if (deltaY > 0 && modalRef.current) {
        modalRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging || !modalRef.current) return;
      
      const deltaY = currentY - startY;
      if (deltaY > 100) {
        onClose();
      } else {
        modalRef.current.style.transform = 'translateY(0)';
      }
      
      isDragging = false;
      startY = 0;
      currentY = 0;
    };

    const modal = modalRef.current;
    modal.addEventListener('touchstart', handleTouchStart);
    modal.addEventListener('touchmove', handleTouchMove);
    modal.addEventListener('touchend', handleTouchEnd);

    return () => {
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 z-[9999] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      onClick={handleBackdropClick}
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
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 pb-safe">
            {children || (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Modal content goes here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}