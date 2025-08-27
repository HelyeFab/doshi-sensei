'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

const KANJI_CHARACTERS = ['愛', '学', '美', '心', '道', '師', '和', '知', '光', '夢'];

const ERROR_MESSAGES = [
  "Oops! Our sensei took an unexpected coffee break...",
  "The kanji got tangled up in the server room...",
  "Our digital tanuki ate something it shouldn't have...",
  "The grammar gods are not pleased...",
  "The server is practicing its silent meditation...",
  "The particles had a party and things got out of hand...",
  "We've encountered a legendary JLPT dragon...",
  "The server is lost in translation...",
  "Our code monkeys need more RAM-en...",
  "The server is experiencing a keigo overflow...",
];

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorMessage] = useState(() => 
    ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
  );
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div 
          className="min-h-screen flex items-center justify-center overflow-hidden relative"
          style={{
            backgroundImage: 'linear-gradient(to right bottom, #5c3cdc, #2263ee, #0080f5, #0099f4, #3bafef, #4fb5ee, #60baee, #70c0ed, #63b8f2, #5ab0f6, #59a7fa, #5f9dfb)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 15s ease infinite'
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
                  opacity: [0, 0.2, 0],
                  scale: [0, 1.2, 0.8],
                  rotate: [0, 180, 360],
                  x: [0, Math.random() * 200 - 100],
                  y: [0, Math.random() * 200 - 100],
                }}
                transition={{
                  duration: 6,
                  delay: index * 0.3,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              >
                {kanji}
              </motion.div>
            ))}
          </div>

          {/* Center Content */}
          <motion.div
            className="relative z-10 max-w-md w-full mx-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
              {/* Doshi Logo with Error State */}
              <motion.div
                className="flex justify-center mb-6"
                animate={{
                  rotate: [-5, 5, -5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <div className="relative">
                  <Image
                    src="/doshi.png"
                    alt="Doshi Sensei"
                    width={100}
                    height={100}
                    className="drop-shadow-xl"
                    priority
                  />
                  <motion.div
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.3 }}
                  >
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Error Code */}
              <motion.div
                className="text-center mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  500
                </h1>
                <p className="text-gray-600 mt-2 font-medium">Internal Server Error</p>
              </motion.div>

              {/* Error Message */}
              <motion.p
                className="text-center text-gray-700 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {errorMessage}
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                className="space-y-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={reset}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Again
                </button>

                <a
                  href="/"
                  className="w-full px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </a>
              </motion.div>

              {/* Error Details Toggle */}
              <motion.div
                className="mt-6 pt-6 border-t border-gray-200"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 mx-auto"
                >
                  <Bug className="w-4 h-4" />
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </button>

                {showDetails && (
                  <motion.div
                    className="mt-4 p-4 bg-gray-50 rounded-lg"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {error.message || 'An unexpected error occurred'}
                    </p>
                    {error.digest && (
                      <p className="text-xs text-gray-500 mt-2">
                        Error ID: {error.digest}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>

              {/* Support Link */}
              <motion.div
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <a
                  href="/contact"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Contact Support
                </a>
              </motion.div>
            </div>
          </motion.div>

          {/* Particle Effects */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 15 }).map((_, index) => (
              <motion.div
                key={index}
                className="absolute w-1 h-1 bg-white/60 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  y: [0, -100],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
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
            
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            }
          `}</style>
        </div>
      </body>
    </html>
  );
}