'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Youtube, Link2, Unlink, AlertCircle, CheckCircle } from 'lucide-react';

export default function YouTubeConnection() {
  const { data: session, status } = useSession();
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);

  // Check if YouTube is connected
  useEffect(() => {
    async function checkConnection() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const youtubeOAuth = userData.youtubeOAuth;
          
          if (youtubeOAuth?.accessToken) {
            setIsConnected(true);
            if (youtubeOAuth.connectedAt) {
              setLastConnected(youtubeOAuth.connectedAt.toDate());
            }
          }
        }
      } catch (error) {
        console.error('Error checking YouTube connection:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkConnection();
  }, [user, session]);

  const handleConnect = async () => {
    setError(null);
    try {
      // Sign in with Google using NextAuth
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: '/settings'
      });

      if (result?.error) {
        setError('Failed to connect YouTube account');
        console.error('Sign in error:', result.error);
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error);
      setError('Failed to connect YouTube account');
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;

    setError(null);
    try {
      // Remove YouTube OAuth data from Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        youtubeOAuth: deleteField()
      });

      // Sign out from NextAuth session
      if (session) {
        await signOut({ redirect: false });
      }

      setIsConnected(false);
      setLastConnected(null);
    } catch (error) {
      console.error('Error disconnecting YouTube:', error);
      setError('Failed to disconnect YouTube account');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 shadow-sm border border-border">
      <div className="mb-4">
        {/* Mobile: Icon above title, Desktop: Icon beside title */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0 w-fit">
            <Youtube className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            YouTube Account Connection
          </h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Connect your YouTube account to access captions from private videos and videos you own. This provides the most reliable caption extraction.
        </p>
      </div>

      {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">YouTube account connected</span>
              </div>
              
              {lastConnected && (
                <p className="text-xs text-muted-foreground">
                  Connected on {lastConnected.toLocaleDateString()}
                </p>
              )}
              
              {session?.user?.email && (
                <p className="text-xs text-muted-foreground">
                  Connected as: {session.user.email}
                </p>
              )}
              
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Unlink className="w-4 h-4" />
                Disconnect YouTube
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 border border-border rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-2">Benefits of connecting:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Access captions from private/unlisted videos</li>
                      <li>Higher success rate for caption extraction</li>
                      <li>Support for multiple caption tracks</li>
                      <li>Works with videos you own or have access to</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Connect YouTube Account
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-secondary border border-border rounded-lg">
              <p className="text-sm text-foreground">{error}</p>
            </div>
          )}

      <div className="mt-6 p-3 bg-secondary/30 border border-border rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Privacy Note:</strong> We only request read-only access to YouTube captions. 
          We cannot modify your account, upload videos, or access your personal data beyond what's needed for caption extraction.
        </p>
      </div>
    </div>
  );
}