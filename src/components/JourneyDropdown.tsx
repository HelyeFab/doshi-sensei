'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface JourneyDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function JourneyDropdown({ isOpen, onToggle }: JourneyDropdownProps) {
  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={onToggle}
        className="text-xl font-semibold text-foreground mb-4 inline-flex items-center gap-2 hover:text-primary transition-colors"
      >
        Begin Your Journey Here
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </motion.div>
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-lg p-6 shadow-lg max-w-2xl mx-auto">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Welcome to the foundation of your Japanese learning adventure. Master the essentials with our
                <span className="font-semibold text-rose-600"> Kana Charts</span> and
                <span className="font-semibold text-orange-600"> Conjugation Practice</span> —
                the building blocks every learner needs.
              </p>

              {/* Stats or motivational elements */}
              <div className="flex flex-wrap gap-6 justify-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌸</span>
                  <span className="text-muted-foreground">Start with Hiragana & Katakana</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-muted-foreground">Master verb conjugations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-muted-foreground">Build strong foundations</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
