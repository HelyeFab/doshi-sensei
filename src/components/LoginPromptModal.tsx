'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  feature?: string;
}

export function LoginPromptModal({ isOpen, onClose, message, feature }: LoginPromptModalProps) {
  const { signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            Login Required
          </h3>
          <p className="text-muted-foreground mb-6 text-sm">
            {message}
          </p>

          {feature && (
            <div className="bg-muted/50 rounded-lg p-3 mb-6">
              <div className="text-sm text-muted-foreground">
                <strong>What you'll get:</strong>
              </div>
              <div className="text-sm text-foreground mt-1">
                • Save your progress across devices
                • Create up to 3 custom study lists
                • 3 drills per day instead of 2
                • Track your learning statistics
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Sign In Free
            </button>
          </div>

          <div className="text-xs text-muted-foreground mt-3">
            Sign in with Google • No spam, ever
          </div>
        </div>
      </div>
    </div>
  );
}
