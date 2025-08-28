'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';

// Dynamically import Lottie to avoid SSR issues
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface NotificationPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onBlock?: () => void;
}

export function NotificationPermissionDialog({ 
  isOpen, 
  onClose, 
  onAllow,
  onBlock 
}: NotificationPermissionDialogProps) {
  const [animationData, setAnimationData] = useState<any>(null);

  // Load animation data
  useEffect(() => {
    if (isOpen && !animationData) {
      fetch('/red-panda/red-panda.json')
        .then(response => response.json())
        .then(data => setAnimationData(data))
        .catch(error => console.error('Failed to load red panda animation:', error));
    }
  }, [isOpen, animationData]);

  const handleBlock = () => {
    if (onBlock) {
      onBlock();
    }
    onClose();
  };

  const handleAllow = () => {
    onAllow();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 md:max-w-md flex items-center justify-center"
          >
            <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border w-full">
              {/* Header with Red Panda */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 sm:p-6">
                {/* Red Panda Animation */}
                {animationData && (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-3 sm:mb-4">
                    <Lottie
                      animationData={animationData}
                      loop={true}
                      autoplay={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                )}
                
                {/* Title */}
                <h2 className="text-lg sm:text-xl font-bold text-center text-foreground mb-2">
                  🔔 Enable Study Reminders?
                </h2>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4">
                {/* Main message */}
                <p className="text-sm sm:text-base text-center text-foreground">
                  <span className="font-semibold">Doshi Sensei</span> wants to send you helpful reminders about your Japanese study progress!
                </p>

                {/* Features list */}
                <div className="space-y-2 sm:space-y-3 bg-muted/50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      Get reminders for vocabulary you've studied
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      Optimal spaced repetition timing (2, 5, 10, 18 days...)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <p className="text-sm text-muted-foreground">
                      Daily motivation from Red Panda-sensei
                    </p>
                  </div>
                </div>

                {/* Privacy note */}
                <p className="text-xs text-muted-foreground text-center italic">
                  You can change this anytime in Settings
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
                <button
                  onClick={handleBlock}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-muted hover:bg-muted/80 text-foreground rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  Not Now
                </button>
                <button
                  onClick={handleAllow}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02] text-sm sm:text-base"
                >
                  Allow Notifications
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for easy usage
export function useNotificationPermissionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [onAllowCallback, setOnAllowCallback] = useState<(() => void) | null>(null);

  const showDialog = (onAllow: () => void) => {
    setOnAllowCallback(() => onAllow);
    setIsOpen(true);
  };

  const handleAllow = () => {
    if (onAllowCallback) {
      onAllowCallback();
    }
    setIsOpen(false);
  };

  const DialogComponent = () => (
    <NotificationPermissionDialog
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onAllow={handleAllow}
    />
  );

  return { showDialog, DialogComponent };
}