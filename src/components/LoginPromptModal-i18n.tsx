'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  feature?: string;
}

export function LoginPromptModal({ isOpen, onClose, message, feature }: LoginPromptModalProps) {
  const { signInWithGoogle } = useAuth();
  const strings = useStrings();

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      // Login failed
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            {strings['components_loginpromptmodal_login_required'] || 'Login Required'}
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              {strings['components_loginpromptmodal_maybe_later'] || 'Maybe Later'}
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              {strings['components_loginpromptmodal_sign_in_free'] || 'Sign In Free'}
            </button>
          </div>

          <div className="text-xs text-muted-foreground mt-3">
            {strings['components_loginpromptmodal_sign_in_with_google'] || 'Sign in with Google • No spam, ever'}
          </div>
        </div>
      </div>
    </div>
  );
}