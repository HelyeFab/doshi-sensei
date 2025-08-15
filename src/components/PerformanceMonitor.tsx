'use client';

import { useEffect } from 'react';

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in browser and in development
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'production') return; // Skip entirely in production
    
    // Defer performance monitoring to avoid blocking main thread
    const timeoutId = setTimeout(() => {
      // Log initial load performance
      if (typeof window !== 'undefined' && window.performance) {
        // Wait for page to be fully loaded
        if (document.readyState === 'complete') {
          logPerformance();
        } else {
          window.addEventListener('load', logPerformance);
        }
      }
    }, 100); // Defer by 100ms to let critical UI render first
    
    function logPerformance() {
      const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {

        console.log({
          'DNS Lookup': `${Math.round(perfData.domainLookupEnd - perfData.domainLookupStart)}ms`,
          'TCP Connection': `${Math.round(perfData.connectEnd - perfData.connectStart)}ms`,
          'Request/Response': `${Math.round(perfData.responseEnd - perfData.requestStart)}ms`,
          'DOM Processing': `${Math.round(perfData.domComplete - perfData.domContentLoadedEventStart)}ms`,
          'Total Load Time': `${Math.round(perfData.loadEventEnd - perfData.fetchStart)}ms`,
          'Time to Interactive': `${Math.round(perfData.domInteractive - perfData.fetchStart)}ms`,
        });
      }
      
      // Log largest contentful paint
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];

        console.log(`${Math.round(lastEntry.startTime)}ms`);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Log first input delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0];

        console.log(`${Math.round(firstInput.processingStart - firstInput.startTime)}ms`);
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      // Monitor long tasks
      if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {

            console.warn({
              duration: `${Math.round(entry.duration)}ms`,
              startTime: `${Math.round(entry.startTime)}ms`,
              name: entry.name
            });
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    }
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('load', logPerformance);
    };
  }, []);
  
  return null;
}