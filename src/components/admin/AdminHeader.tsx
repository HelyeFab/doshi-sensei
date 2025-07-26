'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useStrings } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { navigationRules } from '@/lib/navigation/rules';

interface AdminHeaderProps {
  onMenuClick: () => void;
  title: string;
}

export function AdminHeader({ onMenuClick, title }: AdminHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const strings = useStrings();
  const navigation = useNavigation();

  // Determine if we should show the back button (not on main admin dashboard)
  const normalizedPath = pathname?.replace(/\/+$/, '');
  const shouldShowBackButton = normalizedPath && normalizedPath !== '/admin';

  // Use smart navigation for back button
  const handleBack = () => {
    // Check if we have navigation history
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to hardcoded destinations if no history
      if (pathname.startsWith('/admin/stories/')) router.push('/admin/stories');
      else if (pathname === '/admin/stories') router.push('/admin');
      else if (pathname.startsWith('/admin/mood-boards/')) router.push('/admin/mood-boards');
      else if (pathname === '/admin/mood-boards') router.push('/admin');
      else router.push('/admin');
    }
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Menu button, back button, and title */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label={strings.navigation.menu?.openSidebar || 'Open sidebar'}
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

          {/* Back button - now on the left, before the title */}
          {shouldShowBackButton && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-muted rounded transition-colors inline-flex items-center justify-center"
              aria-label={strings.navigation.menu?.backToAdmin || 'Back to admin'}
              title={strings.navigation.menu?.backToDashboard || 'Back to dashboard'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>

          {/* System status moved to left side after title */}
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground ml-4">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>{strings.navigation.menu?.systemOnline || 'System online'}</span>
          </div>
        </div>

        {/* Right side - Empty for future use */}
        <div className="flex items-center gap-4">
          {/* Space for future admin actions */}
        </div>
      </div>
    </header>
  );
}
