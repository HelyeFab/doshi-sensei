'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface NotificationToastProps {
  message: {
    title: string;
    body: string;
    type?: 'success' | 'info' | 'warning' | 'error';
    action?: string;
  } | null;
  onClose: () => void;
}

export function NotificationToast({ message, onClose }: NotificationToastProps) {
  const [animationData, setAnimationData] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      // Load red panda animation
      fetch('/red-panda/red-panda.json')
        .then(response => response.json())
        .then(data => setAnimationData(data))
        .catch(err => console.error('Failed to load animation:', err));
      
      setIsVisible(true);
      
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to finish
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const bgColor = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  }[message.type || 'info'];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring",
            stiffness: 500,
            damping: 25
          }}
          className="fixed top-4 right-4 z-50 max-w-md"
        >
          <div className={`${bgColor} rounded-lg shadow-2xl overflow-hidden`}>
            <div className="p-4 flex items-start gap-3">
              {/* Red Panda Animation */}
              <div className="flex-shrink-0 w-16 h-16 bg-white rounded-full p-1">
                {animationData ? (
                  <Lottie
                    animationData={animationData}
                    loop={true}
                    autoplay={true}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded-full animate-pulse" />
                )}
              </div>
              
              {/* Message Content */}
              <div className="flex-1 text-white">
                <h3 className="font-bold text-lg">{message.title}</h3>
                <p className="text-sm opacity-90 mt-1">{message.body}</p>
                
                {message.action && (
                  <button
                    onClick={() => {
                      window.location.href = message.action!;
                    }}
                    className="mt-2 text-xs underline hover:no-underline"
                  >
                    View Now →
                  </button>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-white opacity-70 hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Progress Bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-1 bg-white bg-opacity-30"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Global notification listener hook
export function useNotificationToast() {
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      setNotification(event.detail);
    };

    window.addEventListener('app-notification' as any, handleNotification);
    
    // Also listen for Firebase messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'notification') {
          setNotification({
            title: event.data.title || 'New Notification',
            body: event.data.body || 'You have a new message',
            type: 'info',
            action: event.data.action
          });
        }
      });
    }

    return () => {
      window.removeEventListener('app-notification' as any, handleNotification);
    };
  }, []);

  const clearNotification = () => setNotification(null);

  return { notification, clearNotification };
}