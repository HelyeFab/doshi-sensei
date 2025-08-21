'use client';

import { motion } from 'framer-motion';
import { KanjiItem } from '@/types/moodBoard';

interface KanjiCenterProps {
  kanji: KanjiItem;
  isAnimating: boolean;
  theme?: string;
}

export default function KanjiCenter({ kanji, isAnimating, theme }: KanjiCenterProps) {
  return (
    <motion.div
      className="relative z-10"
      animate={isAnimating ? {
        rotate: [0, 5, -5, 0],
        scale: [1, 1.05, 1],
      } : {}}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-30"
        style={{
          background: theme || 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(147,51,234,0.5) 100%)'
        }}
      />
      
      {/* Kanji container */}
      <div className="relative w-32 h-32 md:w-40 md:h-40 bg-card border-2 border-border rounded-full flex items-center justify-center shadow-2xl">
        {/* Inner glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20" />
        
        {/* Kanji character */}
        <span className="relative text-6xl md:text-7xl font-bold text-foreground">
          {kanji.char}
        </span>
        
        {/* Pulse effect */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      </div>
      
      {/* Meaning hint (subtle) */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground opacity-50">
        {kanji.meaning}
      </div>
    </motion.div>
  );
}