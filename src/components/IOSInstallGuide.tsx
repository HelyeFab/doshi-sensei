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
      description: "Find the share icon at the bottom of your Safari browser",
      visual: (
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-white border-t border-gray-200 flex items-center justify-center">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Share className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-blue-500"
            >
              ↓
            </motion.div>
          </div>
        </div>
      )
    },
    {
      icon: <Plus className="w-6 h-6" />,
      title: 'Select "Add to Home Screen"',
      description: "Scroll down in the share menu and tap this option",
      visual: (
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 bg-white rounded-lg">
              <div className="w-8 h-8 bg-gray-300 rounded" />
              <div className="h-2 bg-gray-300 rounded w-24" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="flex items-center gap-3 p-2 bg-blue-50 border-2 border-blue-500 rounded-lg"
            >
              <Plus className="w-8 h-8 text-blue-500" />
              <span className="text-sm font-medium">Add to Home Screen</span>
            </motion.div>
          </div>
        </div>
      )
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Tap Add",
      description: "Confirm to add Doshi Sensei to your home screen",
      visual: (
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden p-4">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500">Cancel</span>
              <span className="text-sm font-medium">Add to Home Screen</span>
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="text-blue-500 font-medium"
              >
                Add
              </motion.span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">DS</span>
              </div>
              <input
                type="text"
                value="Doshi Sensei"
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )
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
        className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">Install Doshi Sensei</h2>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-purple-100 text-sm">
              Add to your home screen for the best experience
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-purple-600'
                      : index < currentStep
                      ? 'w-2 bg-purple-400'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Current step */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                  {steps[currentStep].icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Step {currentStep + 1}: {steps[currentStep].title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {steps[currentStep].description}
                  </p>
                </div>
              </div>
              
              {/* Visual guide */}
              {steps[currentStep].visual}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Previous
                </button>
              )}
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Got it!
                </button>
              )}
            </div>

            {/* Skip button */}
            {currentStep === 0 && (
              <button
                onClick={handleInstallLater}
                className="w-full mt-3 px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Maybe later
              </button>
            )}
          </div>

          {/* Benefits section */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
            <p className="text-xs text-gray-600 font-medium mb-2">Why install?</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-700">
                📱 Works offline
              </span>
              <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-700">
                ⚡ Faster loading
              </span>
              <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-700">
                🔔 Notifications
              </span>
              <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-700">
                💾 Less storage
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}