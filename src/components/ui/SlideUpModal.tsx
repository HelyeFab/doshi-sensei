'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
  fullHeight?: boolean;
  className?: string;
}

export function SlideUpModal({ 
  isOpen, 
  onClose, 
  children, 
  showCloseButton = true,
  fullHeight = false,
  className = ''
}: SlideUpModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-all duration-300 ease-out ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div 
          className={`bg-background rounded-t-2xl shadow-xl ${
            fullHeight ? 'h-screen' : 'max-h-[90vh]'
          } overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Content */}
          <div className={`${fullHeight ? 'h-full' : ''} overflow-y-auto`}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}