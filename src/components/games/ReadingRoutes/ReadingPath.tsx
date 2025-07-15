'use client';

import { motion } from 'framer-motion';
import { ReadingOption } from './gameLogic';
import { useMemo } from 'react';

interface ReadingPathProps {
  reading: ReadingOption;
  angle: number;
  isCorrect: boolean;
  isSelected: boolean;
  showFeedback: boolean;
  onSelect: () => void;
  disabled: boolean;
}

export default function ReadingPath({
  reading,
  angle,
  isCorrect,
  isSelected,
  showFeedback,
  onSelect,
  disabled
}: ReadingPathProps) {
  // Check if mobile outside of useMemo
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  const { x, y, pathData } = useMemo(() => {
    // Responsive radius based on screen size
    const radius = isMobile ? 140 : 200; // Smaller radius on mobile
    const angleRad = (angle * Math.PI) / 180;
    const endX = Math.cos(angleRad) * radius;
    const endY = Math.sin(angleRad) * radius;
    
    // Create curved path
    const controlPoint1X = Math.cos(angleRad) * (radius * 0.3);
    const controlPoint1Y = Math.sin(angleRad) * (radius * 0.3);
    const controlPoint2X = Math.cos(angleRad) * (radius * 0.7);
    const controlPoint2Y = Math.sin(angleRad) * (radius * 0.7);
    
    const path = `M 0,0 C ${controlPoint1X},${controlPoint1Y} ${controlPoint2X},${controlPoint2Y} ${endX},${endY}`;
    
    return { x: endX, y: endY, pathData: path };
  }, [angle, isMobile]);


  const getNodeColor = () => {
    if (!showFeedback) {
      return reading.type === 'on' 
        ? 'bg-red-500/10 border-red-500 hover:bg-red-500/20' 
        : 'bg-blue-500/10 border-blue-500 hover:bg-blue-500/20';
    }
    if (isSelected && isCorrect) return 'bg-green-500/20 border-green-500';
    if (isSelected && !isCorrect) return 'bg-red-500/20 border-red-500';
    if (!isSelected && isCorrect) return 'bg-green-500/10 border-green-500';
    return 'bg-muted/50 border-muted';
  };

  return (
    <motion.button
      className={`absolute px-4 py-3 rounded-lg border-2 transition-all duration-300 ${getNodeColor()} ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        transform: 'translate(-50%, -50%)'
      }}
      onClick={onSelect}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: angle / 360 * 0.3 }}
    >
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">
            {reading.reading}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {reading.romaji}
          </div>
          <div className={`text-xs mt-1 ${
            reading.type === 'on' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
          }`}>
            {reading.type === 'on' ? 'on\'yomi' : 'kun\'yomi'}
          </div>
        </div>
        
        {/* Feedback checkmark/cross */}
        {showFeedback && isSelected && (
          <motion.div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {isCorrect ? '✅' : '❌'}
          </motion.div>
        )}
    </motion.button>
  );
}