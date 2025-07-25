'use client';

import { useEffect, useState } from 'react';
import { useStrings } from '@/contexts/LanguageContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm, isDeleting = false }: DeleteAccountModalProps) {
  const strings = useStrings();
  const [confirmText, setConfirmText] = useState('');
  
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isDeleting]);

  // Reset confirmation text when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canDelete = confirmText.toLowerCase() === 'delete';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-xl max-w-md w-full mx-4 relative animate-in fade-in duration-200"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Close button */}
        {!isDeleting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Modal content */}
        <div className="p-6 text-center">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 p-2 rounded-full bg-red-100">
              <svg className="w-full h-full text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground mb-3">
            Delete Your Account?
          </h3>

          {/* Warning message */}
          <div className="text-left space-y-3 mb-4">
            <p className="text-muted-foreground">
              This action cannot be undone. Deleting your account will:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Permanently delete all your progress and stats</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Remove all your caught Pokémon</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Cancel any active subscriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Delete your account permanently</span>
              </li>
            </ul>
          </div>

          {/* Confirmation input */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              To confirm deletion, type <span className="font-mono font-semibold text-foreground">DELETE</span> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={isDeleting}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!canDelete || isDeleting}
              className="flex-1 px-4 py-3 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: !canDelete || isDeleting ? '#f97316' : 'hsl(25, 95%, 53%)',
                opacity: !canDelete || isDeleting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (canDelete && !isDeleting) {
                  e.currentTarget.style.backgroundColor = 'hsl(25, 95%, 48%)';
                }
              }}
              onMouseLeave={(e) => {
                if (canDelete && !isDeleting) {
                  e.currentTarget.style.backgroundColor = 'hsl(25, 95%, 53%)';
                }
              }}
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Deleting...
                </span>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}