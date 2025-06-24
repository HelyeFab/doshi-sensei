'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

interface AdminHeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Determine if we should show the back button (not on main admin dashboard)
  const shouldShowBackButton = pathname !== '/admin';

  const handleBackClick = () => {
    router.push('/admin');
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to home page after successful logout
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu button and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Open sidebar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>

        {/* Right side - Back button, User info and actions */}
        <div className="flex items-center gap-4">
          {/* Back button - positioned safely on the right side */}
          {shouldShowBackButton && (
            <button
              onClick={handleBackClick}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors inline-flex items-center justify-center"
              aria-label="Back to admin dashboard"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {/* Quick stats - optional, can be added later */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>System Online</span>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {user?.displayName || 'Admin'}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                {user?.displayName?.[0] || user?.email?.[0] || 'A'}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                title="Logout"
                aria-label="Logout"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
