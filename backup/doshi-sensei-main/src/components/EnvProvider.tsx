'use client';

import { useEffect } from 'react';

interface EnvProviderProps {
  children: React.ReactNode;
}

export function EnvProvider({ children }: EnvProviderProps) {
  useEffect(() => {
    // Expose environment variables to the client-side code
    if (typeof window !== 'undefined') {
      (window as any).ENV = {
        WANIKANI_API_TOKEN: process.env.WANIKANI_API_TOKEN,
      };

      console.log('Environment variables exposed to client-side code');
    }
  }, []);

  return <>{children}</>;
}
