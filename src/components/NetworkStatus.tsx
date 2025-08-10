'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ConnectionQuality = 'good' | 'slow' | 'offline';

interface NetworkInfo {
  isOnline: boolean;
  quality: ConnectionQuality;
  downlink?: number; // Mbps
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number; // Round trip time in ms
}

export default function NetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: true,
    quality: 'good'
  });
  const [showNotification, setShowNotification] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  useEffect(() => {
    // Check initial connection status
    updateNetworkStatus();

    // Set up event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality periodically
    const interval = setInterval(checkConnectionQuality, 10000); // Every 10 seconds

    // Monitor network changes if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', updateNetworkStatus);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', updateNetworkStatus);
        }
      }
    };
  }, []);

  const handleOnline = () => {
    setNetworkInfo(prev => ({ ...prev, isOnline: true }));
    checkConnectionQuality();
    showTemporaryNotification('good');
  };

  const handleOffline = () => {
    setNetworkInfo({ isOnline: false, quality: 'offline' });
    showTemporaryNotification('offline');
  };

  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      setNetworkInfo({ isOnline: false, quality: 'offline' });
      return;
    }

    // Check Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const downlink = connection.downlink; // Mbps
        const effectiveType = connection.effectiveType;
        const rtt = connection.rtt; // Round trip time

        let quality: ConnectionQuality = 'good';
        
        // More lenient thresholds for better user experience
        // Only mark as slow for really poor connections
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          quality = 'slow';
        } else if (downlink < 0.3) { // Only very slow connections (was 2 Mbps)
          quality = 'slow';
        } else if (rtt > 2000) { // Only extremely high latency (was 400ms)
          quality = 'slow';
        } else {
          quality = 'good';
        }

        setNetworkInfo({
          isOnline: true,
          quality,
          downlink,
          effectiveType,
          rtt
        });

        // Show notification if connection is slow
        if (quality === 'slow') {
          showTemporaryNotification('slow');
        }
      }
    }
  };

  const checkConnectionQuality = async () => {
    if (!navigator.onLine) {
      setNetworkInfo({ isOnline: false, quality: 'offline' });
      return;
    }

    try {
      // Ping a small resource to check real connectivity and speed
      const startTime = performance.now();
      const response = await fetch('/api/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      let quality: ConnectionQuality = 'good';
      
      // Much more lenient - only flag as slow if really bad
      if (!response.ok) {
        quality = 'slow';
      } else if (latency > 5000) { // 5 seconds is really slow (was 2s)
        quality = 'slow';
      }

      setNetworkInfo(prev => ({
        ...prev,
        isOnline: true,
        quality,
        rtt: Math.round(latency)
      }));

      if (quality === 'slow') {
        showTemporaryNotification('slow');
      }
    } catch (error) {
      // Network error - might be offline or very slow
      console.error('Network quality check failed:', error);
      setNetworkInfo(prev => ({
        ...prev,
        quality: 'slow'
      }));
    }
  };

  const showTemporaryNotification = (quality: ConnectionQuality) => {
    const now = Date.now();
    // Don't show notifications too frequently (minimum 30 seconds between)
    if (now - lastNotificationTime < 30000) return;
    
    setLastNotificationTime(now);
    setShowNotification(true);
    
    // Auto-hide after 5 seconds for good connection, 10 seconds for issues
    setTimeout(() => {
      setShowNotification(false);
    }, quality === 'good' ? 5000 : 10000);
  };

  const handleDismiss = () => {
    setShowNotification(false);
    setLastNotificationTime(Date.now()); // Prevent immediate re-show
  };

  // Don't show anything if connection is good and no recent changes
  if (networkInfo.quality === 'good' && !showNotification) {
    return null;
  }

  const getNotificationContent = () => {
    switch (networkInfo.quality) {
      case 'offline':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          ),
          title: 'No Internet Connection',
          message: 'Some features may be unavailable',
          bgColor: 'hsl(var(--destructive))',
          textColor: 'hsl(var(--destructive-foreground))'
        };
      case 'slow':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          title: 'Slow Connection',
          message: 'Loading may take longer than usual',
          bgColor: 'hsl(var(--warning))',
          textColor: 'hsl(var(--warning-foreground))'
        };
      case 'good':
        return {
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          ),
          title: 'Connection Restored',
          message: 'You\'re back online',
          bgColor: 'hsl(var(--success))',
          textColor: 'hsl(var(--success-foreground))'
        };
    }
  };

  const content = getNotificationContent();

  return (
    <AnimatePresence>
      {(showNotification || networkInfo.quality !== 'good') && (
        <>
          {/* Backdrop for dismissible interaction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998]"
            onClick={handleDismiss}
          />
          
          {/* Notification popup */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999]"
            onClick={handleDismiss}
          >
            <div 
              className="rounded-xl shadow-xl px-6 py-4 flex flex-col items-center gap-3 min-w-[280px] max-w-[90vw] border cursor-pointer"
              style={{
                backgroundColor: content.bgColor,
                color: content.textColor,
                borderColor: 'hsl(var(--border))'
              }}
            >
              <div className="p-3 bg-white/20 rounded-full">
                {content.icon}
              </div>
              <div className="text-center">
                <p className="font-semibold text-base mb-1">{content.title}</p>
                <p className="text-sm opacity-90">{content.message}</p>
              </div>
              {networkInfo.quality === 'offline' && (
                <div className="animate-pulse">
                  <div className="w-2 h-2 bg-current rounded-full opacity-60"></div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to use network status in other components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setIsOnline(navigator.onLine);
      
      // Check connection quality with lenient thresholds
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const effectiveType = connection.effectiveType;
          const downlink = connection.downlink;
          // Only mark as slow for really poor connections
          setIsSlowConnection(
            effectiveType === 'slow-2g' || 
            effectiveType === '2g' || 
            downlink < 0.3 // Only very slow connections
          );
        }
      }
    };

    checkStatus();
    
    window.addEventListener('online', checkStatus);
    window.addEventListener('offline', checkStatus);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', checkStatus);
      }
    }

    return () => {
      window.removeEventListener('online', checkStatus);
      window.removeEventListener('offline', checkStatus);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          connection.removeEventListener('change', checkStatus);
        }
      }
    };
  }, []);

  return { isOnline, isSlowConnection };
}