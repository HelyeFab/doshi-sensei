'use client';

import { useEffect } from 'react';
import { enhancedConsoleCapture } from '@/utils/enhancedConsoleCapture';
import { consoleLogControl } from '@/utils/consoleLogControl';

export function ConsoleLogInitializer() {
  useEffect(() => {
    // Initialize enhanced console capture in development
    if (process.env.NODE_ENV === 'development') {
      // Start enhanced capture if not already started
      enhancedConsoleCapture.startCapture();
      console.log('🎯 Enhanced console capture initialized');
    }

    // Initialize console log control
    // This loads saved settings from localStorage
    const config = consoleLogControl.getConfig();
    console.log('🎮 Console log control initialized', { 
      enabled: config.enabled, 
      logLevel: config.logLevel 
    });
  }, []);

  return null;
}