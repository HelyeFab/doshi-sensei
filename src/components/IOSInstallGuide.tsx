'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function IOSInstallGuide() {
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice && isSafari);
    setIsStandalone(isInStandalone);

    // Check if we should show the guide
    if (isIOSDevice && isSafari && !isInStandalone) {
      // Check if user has dismissed recently
      const lastDismissed = localStorage.getItem('ios_install_dismissed');
      const now = Date.now();
      const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
      
      if (!lastDismissed || (now - parseInt(lastDismissed)) > THREE_DAYS) {
        // Show after a slight delay for better UX
        setTimeout(() => setShowGuide(true), 5000);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowGuide(false);
    localStorage.setItem('ios_install_dismissed', Date.now().toString());
  };

  const handleInstallLater = () => {
    handleDismiss();
  };

  const steps = [
    {
      icon: <Share className="w-6 h-6" />,
      title: "Tap the Share Button",
      description: "Find the share icon at the bottom of your Safari browser"
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: 'Select "Add to Home Screen"',
      description: "Scroll down in the share menu and tap this option"
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Tap Add",
      description: "Confirm to add Doshi Sensei to your home screen"
    }
  ];

  if (!isIOS || isStandalone || !showGuide) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with pastel gradient */}
          <div className="bg-gradient-to-br from-purple-200 via-pink-100 to-blue-100 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-800">Install Doshi Sensei</h2>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-white/40 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              Add to your home screen for the best experience
            </p>
          </div>

          {/* Content */}
          <div className="p-6 bg-gray-50">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-purple-400'
                      : index < currentStep
                      ? 'w-2 bg-purple-300'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Simplified text-only instructions */}
            <div className="mb-6 text-center">
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Step {currentStep + 1}: {steps[currentStep].title}
              </h3>
              <p className="text-gray-600 text-sm">
                {steps[currentStep].description}
              </p>
              
              {/* Simple icon visualization */}
              <div className="my-8 flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                  <div className="text-purple-500">
                    {steps[currentStep].icon}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation buttons with pastel colors */}
            <div className="space-y-3">
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-2xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-sm"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-400 to-pink-400 text-white rounded-2xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-sm"
                >
                  Done
                </button>
              )}
              
              <button
                onClick={handleInstallLater}
                className="w-full px-6 py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>

          {/* Simplified benefits section */}
          <div className="bg-white px-6 py-4 border-t border-gray-100">
            <p className="text-center text-xs text-gray-500 font-medium mb-3">Why install?</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="text-sm text-gray-600">
                <span className="block text-lg mb-1">📱</span>
                Works offline
              </div>
              <div className="text-sm text-gray-600">
                <span className="block text-lg mb-1">⚡</span>
                Faster loading
              </div>
              <div className="text-sm text-gray-600">
                <span className="block text-lg mb-1">🔔</span>
                Notifications
              </div>
              <div className="text-sm text-gray-600">
                <span className="block text-lg mb-1">💾</span>
                Less storage
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}