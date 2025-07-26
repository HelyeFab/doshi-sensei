'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SwipeHintProps {
  isVisible: boolean;
  direction: 'left' | 'right' | null;
  canGoBack: boolean;
  canGoForward: boolean;
}

export function SwipeHint({ isVisible, direction, canGoBack, canGoForward }: SwipeHintProps) {
  return (
    <>
      {/* Edge indicators when user can navigate */}
      {canGoBack && (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 w-1 h-24 bg-primary/20 rounded-r-full pointer-events-none md:hidden" />
      )}
      {canGoForward && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 w-1 h-24 bg-primary/20 rounded-l-full pointer-events-none md:hidden" />
      )}

      {/* Swipe hint animation */}
      <AnimatePresence>
        {isVisible && direction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50 md:hidden"
          >
            {direction === 'right' && canGoBack && (
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium">Swipe to go back</span>
                </div>
              </motion.div>
            )}
            
            {direction === 'left' && canGoForward && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <div className="bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <span className="text-sm font-medium">Swipe to go forward</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}