'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';
import { motion, AnimatePresence } from 'framer-motion';

interface DonationThankYouProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
}

export default function DonationThankYou({ isOpen, onClose, amount }: DonationThankYouProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Stop confetti after 10 seconds
      const timer = setTimeout(() => setShowConfetti(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedAmount = amount ? `$${(amount / 100).toFixed(2)}` : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti */}
          {showConfetti && (
            <Confetti
              width={width}
              height={height}
              recycle={false}
              numberOfPieces={500}
              gravity={0.15}
              colors={['#8a5cf6', '#d946ef', '#ec4899', '#f97316', '#fbbf24', '#10b981']}
            />
          )}

          {/* Modal Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary via-accent to-secondary p-8 text-center">
                {/* Animated emoji */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>
                
                <h2 className="text-3xl font-bold text-white mb-2">
                  ありがとうございます！
                </h2>
                <p className="text-xl text-white/95">
                  Thank You So Much!
                </p>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 text-center">
                {/* Coffee animation */}
                <div className="flex justify-center space-x-2">
                  <motion.span
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    className="text-4xl"
                  >
                    ☕
                  </motion.span>
                  <motion.span
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="text-4xl"
                  >
                    💜
                  </motion.span>
                  <motion.span
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    className="text-4xl"
                  >
                    ☕
                  </motion.span>
                </div>

                {/* Thank you message */}
                <div className="space-y-3">
                  {amount && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full font-semibold text-lg"
                    >
                      {formattedAmount} Received!
                    </motion.div>
                  )}
                  
                  <p className="text-foreground text-lg leading-relaxed">
                    Your generous support means the world to us! 
                  </p>
                  
                  <p className="text-muted-foreground">
                    Thanks to supporters like you, we can keep improving Dōshi Sensei 
                    and making Japanese learning accessible to everyone.
                  </p>
                </div>

                {/* Cute emoji parade */}
                <motion.div 
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center space-x-3 text-2xl"
                >
                  <span>🇯🇵</span>
                  <span>📚</span>
                  <span>✨</span>
                  <span>🚀</span>
                  <span>❤️</span>
                </motion.div>

                {/* Personal message */}
                <div className="bg-secondary/10 rounded-lg p-4 border border-secondary/20">
                  <p className="text-sm text-muted-foreground italic">
                    "Every coffee helps fuel late-night coding sessions and new feature development. 
                    You're not just a user, you're part of the Dōshi Sensei family!"
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    - The Dōshi Sensei Team 💜
                  </p>
                </div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground rounded-xl p-4 font-semibold text-lg transition-all shadow-lg"
                >
                  Continue Learning! 🎯
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}