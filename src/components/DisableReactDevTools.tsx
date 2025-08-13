'use client';

import { useEffect } from 'react';

export default function DisableReactDevTools() {
  useEffect(() => {
    // Only disable in production
    if (process.env.NODE_ENV === 'production') {
      // Check if React DevTools is present
      if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        // Disable React DevTools
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.isDisabled = true;
        
        // Remove the hook entirely for extra security
        // This prevents any performance overhead from the DevTools
        delete window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        
        // Also disable Redux DevTools if present
        if (window.__REDUX_DEVTOOLS_EXTENSION__) {
          window.__REDUX_DEVTOOLS_EXTENSION__ = undefined;
        }
      }
    }
  }, []);

  return null;
}