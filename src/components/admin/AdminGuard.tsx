'use client';

import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_EMAIL } from '@/types/admin';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // If not authenticated or not admin, redirect to 404
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace('/404');
        return;
      }
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // If user is not admin, don't render anything (redirect is in useEffect)
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  // User is admin, render the protected content
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
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
