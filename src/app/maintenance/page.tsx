'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

const KANJI_CHARACTERS = ['休', '修', '理', '中', '待', '止', '整', '備', '直', '新'];

const MAINTENANCE_MESSAGES = [
  "Teaching Dōshi-kun to count to infinity...",
  "Repairing the honorific circuits...",
  "Recalibrating the kanji recognition matrix...",
  "Feeding the server hamsters...",
  "Updating the dictionary of dad jokes...",
  "Rebooting the virtual sensei...",
  "Defragmenting the hiragana database...",
  "Installing new verb conjugations...",
  "Optimizing the particle accelerator...",
  "Downloading more vocabulary RAM...",
  "Debugging the keigo protocols...",
  "Synchronizing the JLPT levels...",
  "Refreshing the furigana cache...",
  "Upgrading to Nihongo 2.0...",
  "Performing routine seppuku on bugs...",
];

export default function MaintenancePage() {
  const searchParams = useSearchParams();
  const [loadingMessage] = useState(() => 
    MAINTENANCE_MESSAGES[Math.floor(Math.random() * MAINTENANCE_MESSAGES.length)]
  );
  
  const reason = searchParams.get('reason');
  const customMessage = searchParams.get('message');
  const estimatedTime = searchParams.get('eta');

  // Auto-refresh every 30 seconds to check if maintenance is over
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #ffc371 100%)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 8s ease infinite'
      }}
    >
      {/* Floating Kanji Background */}
      <div className="absolute inset-0">
        {KANJI_CHARACTERS.map((kanji, index) => (
          <motion.div
            key={kanji}
            className="absolute text-white/10 select-none"
            style={{
              fontSize: `${Math.random() * 60 + 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0, 1.2, 0.8],
              rotate: [0, 180, 360],
              x: [0, Math.random() * 200 - 100],
              y: [0, Math.random() * 200 - 100],
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
        ))}
      </div>

      {/* Center Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center px-4 max-w-2xl mx-auto text-center"
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
          />
        </motion.div>

        {/* Animated Kanji Row */}
        <div className="flex gap-4 mb-8">
          {['メ', 'ン', 'テ', 'ナ', 'ン', 'ス'].map((char, index) => (
            <motion.div
              key={`${char}-${index}`}
              className="text-3xl md:text-4xl font-bold text-white"
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
              {char}
            </motion.div>
          ))}
        </div>

        {/* Title */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{
            textShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          We'll Be Right Back!
        </motion.h1>

        {/* Main Message */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <p className="text-lg md:text-xl text-white/95 mb-3">
            {customMessage || "We're performing scheduled maintenance to improve your learning experience."}
          </p>
          
          {estimatedTime && (
            <p className="text-md text-white/80">
              Estimated time: <strong>{estimatedTime}</strong>
            </p>
          )}
        </motion.div>

        {/* Loading Message */}
        <motion.p
          className="text-md md:text-lg text-white/70 mb-6 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          {loadingMessage}
        </motion.p>

        {/* Loading Bar */}
        <motion.div
          className="w-full max-w-xs mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
        >
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: '30%',
              }}
            />
          </div>
        </motion.div>

        {/* Loading Dots */}
        <div className="flex gap-2 mb-8">
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

        {/* Additional Info */}
        <motion.div
          className="text-white/60 text-sm space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <p>Meanwhile, why not practice your hiragana? 🎌</p>
          <p className="text-xs">
            {reason === 'admin_dashboard' && '(Maintenance activated by administrator)'}
            {reason === 'env_variable' && '(System maintenance mode)'}
            {reason === 'emergency_shutdown' && '(Emergency maintenance)'}
          </p>
        </motion.div>

        {/* Social Links */}
        <motion.div
          className="mt-8 flex gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.5 }}
        >
          <a
            href="https://twitter.com/doshisensei"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white transition-colors"
          >
            Follow us for updates
          </a>
        </motion.div>
      </motion.div>

      {/* Particle Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, index) => (
          <motion.div
            key={index}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
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
    </div>
  );
}