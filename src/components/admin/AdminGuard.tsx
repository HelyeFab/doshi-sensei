'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!loading && user) {
        // First check client-side email for quick rejection
        if (user.email !== ADMIN_EMAIL) {
          router.replace('/');
          return;
        }

        setIsVerifyingAdmin(true);
        
        try {
          // Get Firebase ID token
          const token = await user.getIdToken();
          
          // Verify admin role server-side - use absolute URL to ensure correct path
          const baseUrl = window.location.origin;
          const response = await fetch(`${baseUrl}/api/admin/verify-role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (!response.ok) {
            console.error('Admin verification failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Verification failed: ${response.status}`);
          }

          const result = await response.json();

          if (result.isAdmin) {
            setIsAdminVerified(true);
          } else {
            console.warn('User is not admin:', user.email);
            router.replace('/');
          }
        } catch (error) {
          console.error('Admin verification error:', error);
          router.replace('/');
        } finally {
          setIsVerifyingAdmin(false);
        }
      } else if (!loading && !user) {
        router.replace('/');
      }
    };

    verifyAdminRole();
  }, [user, loading, router]);

  // Show loading while checking authentication or verifying admin
  if (loading || isVerifyingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">
            {loading ? 'Checking authentication...' : 'Verifying admin access...'}
          </p>
        </div>
      </div>
    );
  }

  // If user is not admin or verification failed, don't render anything
  if (!user || !isAdminVerified) {
    return null;
  }

  // User is verified admin, render the protected content
  return <>{children}</>;
}

// Alternative NotFound component for admin routes
export function AdminNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-6">🚫</div>
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Access Denied
        </h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this admin area.
          Only authorized administrators can view this content.
        </p>
        <SmartNavigationLink href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
         title="← Back to Home">
          ← Back to Home
        </SmartNavigationLink>
      </div>
    </div>
  );
}
