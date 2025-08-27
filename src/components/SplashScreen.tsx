'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const KANJI_CHARACTERS = ['愛', '学', '美', '心', '道', '師', '和', '知', '光', '夢'];

const LOADING_MESSAGES = [
  "Teaching Dōshi-kun new verb forms...",
  "Convincing kanji to stay in order...",
  "Feeding the digital tanuki...",
  "Calibrating the furigana generator...",
  "Organizing the particle party...",
  "Waking up the sleepy senpai...",
  "Polishing the virtual genkan...",
  "Charging the kawaii meters...",
  "Summoning the grammar gods...",
  "Bribing the JLPT dragons...",
  "Untangling the keigo knots...",
  "Warming up the wa particles...",
  "Debugging the dakuten...",
  "Alphabetizing the あいうえお...",
  "Caffeinating the code monkeys...",
  "Negotiating with nihongo...",
  "Downloading more RAM-en...",
  "Reticulating splines in Japanese...",
  "Pressing X to pay respects (敬語)...",
  "404: Humor not found. Just kidding!",
];

interface SplashScreenProps {
  duration?: number; // Duration in milliseconds
  forceShow?: boolean; // For testing purposes
}

// Deterministic pseudo-random based on index
const getPseudoRandom = (index: number, seed: number = 0) => {
  const value = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453123;
  return value - Math.floor(value);
};

export default function SplashScreen({ duration = 3000, forceShow = false }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Use a deterministic message based on current date to avoid hydration mismatch
  const loadingMessage = useMemo(() => {
    const index = new Date().getDate() % LOADING_MESSAGES.length;
    return LOADING_MESSAGES[index];
  }, []);

  // Generate deterministic positions for kanji
  const kanjiPositions = useMemo(() => {
    return KANJI_CHARACTERS.map((_, index) => ({
      fontSize: getPseudoRandom(index, 1) * 60 + 40,
      left: getPseudoRandom(index, 2) * 100,
      top: getPseudoRandom(index, 3) * 100,
      animateX: getPseudoRandom(index, 4) * 200 - 100,
      animateY: getPseudoRandom(index, 5) * 200 - 100,
    }));
  }, []);

  useEffect(() => {
    // Only show splash screen once per session
    setIsMounted(true);
    
    // Check if splash has already been shown this session
    const hasShownSplash = sessionStorage.getItem('splash-shown') === 'true';
    
    if (!hasShownSplash && !forceShow) {
      setIsVisible(true);
      sessionStorage.setItem('splash-shown', 'true');
    } else if (forceShow) {
      setIsVisible(true);
    }
  }, [forceShow]);

  useEffect(() => {
    if (!forceShow && isMounted && isVisible) {
      // Hide splash screen after specified duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, forceShow, isMounted, isVisible]);

  // Don't render anything on server to avoid hydration issues
  if (!isMounted) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          style={{
            backgroundImage: 'linear-gradient(to right bottom, #5c3cdc, #2263ee, #0080f5, #0099f4, #3bafef, #4fb5ee, #60baee, #70c0ed, #63b8f2, #5ab0f6, #59a7fa, #5f9dfb)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 8s ease infinite'
          }}
        >
          {/* Floating Kanji Background */}
          <div className="absolute inset-0">
            {KANJI_CHARACTERS.map((kanji, index) => {
              const pos = kanjiPositions[index];
              return (
                <motion.div
                  key={kanji}
                  className="absolute text-white/10 select-none"
                  style={{
                    fontSize: `${pos.fontSize}px`,
                    left: `${pos.left}%`,
                    top: `${pos.top}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 0.3, 0],
                    scale: [0, 1.2, 0.8],
                    rotate: [0, 180, 360],
                    x: [0, pos.animateX],
                    y: [0, pos.animateY],
                  }}
                transition={{
                  duration: 3,
                  delay: index * 0.2,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                >
                  {kanji}
                </motion.div>
              );
            })}
          </div>

          {/* Center Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* Doshi Logo */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="mb-8"
            >
              <Image
                src="/doshi.png"
                alt="Doshi Sensei"
                width={120}
                height={120}
                className="drop-shadow-2xl"
                priority
              />
            </motion.div>

            {/* Animated Kanji Row */}
            <div className="flex gap-4 mb-8">
              {['道', '師', '先', '生'].map((kanji, index) => (
                <motion.div
                  key={kanji}
                  className="text-4xl font-bold text-white"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.5 + index * 0.1,
                    duration: 0.5,
                  }}
                  style={{
                    textShadow: '0 0 20px rgba(255,255,255,0.5)',
                  }}
                >
                  {kanji}
                </motion.div>
              ))}
            </div>

            {/* Title with macron */}
            <motion.h1
              className="text-2xl font-bold text-white mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              Dōshi Sensei
            </motion.h1>

            {/* Loading Message */}
            <motion.p
              className="text-lg text-white/90 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              {loadingMessage}
            </motion.p>

            {/* Loading Dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="w-3 h-3 bg-white rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.2,
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Particle Effects */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, index) => {
              const particleLeft = getPseudoRandom(index + 100, 6) * 100;
              const particleTop = getPseudoRandom(index + 100, 7) * 100;
              const particleDelay = getPseudoRandom(index + 100, 8) * 2;
              
              return (
                <motion.div
                  key={index}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${particleLeft}%`,
                    top: `${particleTop}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: particleDelay,
                  }}
                />
              );
            })}
          </div>

          {/* CSS for gradient animation */}
          <style jsx global>{`
            @keyframes gradientShift {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}