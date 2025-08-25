'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide splash screen after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-primary via-accent to-secondary"
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
            {/* Logo */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.8
              }}
              className="mb-8"
            >
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
              <div className="flex space-x-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{
                      y: ["0%", "-50%", "0%"],
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