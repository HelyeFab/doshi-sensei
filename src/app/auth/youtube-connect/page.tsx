'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Youtube } from 'lucide-react';

export default function YouTubeConnectPage() {
  useEffect(() => {
    // Automatically trigger Google sign-in when page loads
    signIn('google', { callbackUrl: '/settings' });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card p-8 rounded-xl shadow-lg border border-border max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="p-4 bg-destructive/10 rounded-full mb-4">
            <Youtube className="w-12 h-12 text-destructive" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Connecting to YouTube
          </h1>
          
          <p className="text-muted-foreground text-center mb-6">
            Please wait while we connect your YouTube account...
          </p>
          
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive"></div>
        </div>
      </div>
    </div>
  );
}