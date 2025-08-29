'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import DoshiMascot from '@/components/DoshiMascot';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

const ERROR_MESSAGES = [
  "Oops! Doshi-sensei needs a moment...",
  "The kanji got a bit confused...",
  "Something went sideways in our dojo...",
  "Our digital sensei is meditating...",
  "The server is practicing its kata...",
];

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorMessage] = useState(() => 
    ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
  );

  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-purple-50 to-blue-50">
      <motion.div 
        className="max-w-md w-full"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Doshi Logo */}
          <motion.div
            className="flex justify-center mb-6"
            animate={{
              rotate: [-3, 3, -3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="relative">
              <DoshiMascot
                variant="animated"
                size="medium"
                className="drop-shadow-lg"
                priority
              />
              <motion.div
                className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.3 }}
              >
                <AlertTriangle className="w-4 h-4 text-gray-800" />
              </motion.div>
            </div>
          </motion.div>

          {/* Error Message */}
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Oops!
          </h1>
          <p className="text-gray-700 mb-6">
            {errorMessage}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>

            <a
              href="/"
              className="w-full px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2 inline-block"
            >
              <Home className="w-5 h-5" />
              Go Home
            </a>
          </div>

          {/* Error Details */}
          {error.digest && (
            <p className="text-xs text-gray-400 mt-6">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}