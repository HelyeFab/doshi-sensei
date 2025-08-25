'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  duration?: number; // Duration in milliseconds
  forceShow?: boolean; // For testing purposes
}

export default function SplashScreen({ duration = 2000, forceShow = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!forceShow) {
      // Hide splash screen after specified duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, forceShow]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-10 text-[120px] text-white/10 animate-pulse font-bold">道</div>
            <div className="absolute bottom-20 right-20 text-[120px] text-white/10 animate-pulse font-bold" style={{ animationDelay: '0.5s' }}>師</div>
            <div className="absolute top-1/3 right-1/4 text-[100px] text-white/10 animate-pulse font-bold" style={{ animationDelay: '1s' }}>先</div>
            <div className="absolute bottom-1/3 left-1/3 text-[100px] text-white/10 animate-pulse font-bold" style={{ animationDelay: '0.75s' }}>生</div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo with Yokoso */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.8
              }}
              className="mb-8 relative"
            >
              {/* Yokoso text in semicircle above mascot */}
              <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  {['よ', 'う', 'こ', 'そ', '！'].map((char, i) => {
                    const angle = -50 + (i * 25); // Spread from -50 to +50 degrees
                    const radius = 85; // Increased distance from center
                    const x = Math.sin(angle * Math.PI / 180) * radius;
                    const y = -Math.cos(angle * Math.PI / 180) * radius + 30;
                    
                    return (
                      <motion.span
                        key={i}
                        className="absolute text-white font-bold text-4xl" // Increased from text-2xl to text-4xl
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: 'translate(-50%, -50%)',
                          textShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', // Added text shadow for better visibility
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [1, 1.3, 1], // Increased animation scale
                          opacity: 1,
                        }}
                        transition={{
                          delay: 0.5 + i * 0.1,
                          scale: {
                            duration: 2,
                            repeat: Infinity,
                            delay: 0.5 + i * 0.1,
                          },
                          opacity: {
                            duration: 0.3,
                          }
                        }}
                      >
                        {char}
                      </motion.span>
                    );
                  })}
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl"></div>
                <Image
                  src="/doshi.png"
                  alt="Dōshi Sensei"
                  width={120}
                  height={120}
                  className="relative drop-shadow-2xl"
                  priority
                />
              </div>
            </motion.div>

            {/* App Name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-white mb-2">
                Dōshi Sensei
              </h1>
              <p className="text-lg text-white/90">
                Master Japanese, One Step at a Time
              </p>
            </motion.div>

            {/* Loading indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12"
            >
              <div className="flex space-x-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-4 h-4 bg-white rounded-full shadow-lg"
                    animate={{
                      y: ["0%", "-60%", "0%"],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}