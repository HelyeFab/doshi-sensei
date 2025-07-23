'use client';

import { useAdmin } from '@/contexts/AdminContext';
import { AdminSection } from '@/types/admin';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStrings } from '@/contexts/LanguageContext';

interface SidebarItem {
  id: AdminSection;
  labelKey: string;
  iconKey: string;
  href: string;
}

// Define the structure without calling hooks
const sidebarItemsConfig: Omit<SidebarItem, 'label' | 'icon'>[] = [
  {
    id: 'dashboard',
    labelKey: 'dashboard',
    iconKey: 'dashboard',
    href: '/admin',
  },
  {
    id: 'users',
    labelKey: 'users',
    iconKey: 'users',
    href: '/admin/users',
  },
  {
    id: 'features' as AdminSection,
    labelKey: 'features',
    iconKey: 'features',
    href: '/admin/features',
  },
  {
    id: 'achievements' as AdminSection,
    labelKey: 'achievements',
    iconKey: 'achievements',
    href: '/admin/achievements',
  },
  {
    id: 'analytics' as AdminSection,
    labelKey: 'analytics',
    iconKey: 'analytics',
    href: '/admin/analytics',
  },
  {
    id: 'mood-boards' as AdminSection,
    labelKey: 'moodBoards',
    iconKey: 'moodBoards',
    href: '/admin/mood-boards',
  },
  {
    id: 'resources' as AdminSection,
    labelKey: 'resources',
    iconKey: 'resources',
    href: '/admin/resources',
  },
  {
    id: 'stories' as AdminSection,
    labelKey: 'stories',
    iconKey: 'stories',
    href: '/admin/stories',
  },
  {
    id: 'articles' as AdminSection,
    labelKey: 'articles',
    iconKey: 'articles',
    href: '/admin/articles',
  },
  {
    id: 'activities' as AdminSection,
    labelKey: 'activities',
    iconKey: 'activities',
    href: '/admin/activities',
  },
  {
    id: 'activity-logs' as AdminSection,
    labelKey: 'logs',
    iconKey: 'logs',
    href: '/admin/logs',
  },
  {
    id: 'debug' as AdminSection,
    labelKey: 'debug',
    iconKey: 'debug',
    href: '/admin/debug',
  },
  {
    id: 'snake-path' as AdminSection,
    labelKey: 'snakePath',
    iconKey: 'snakePath',
    href: '/admin/snake-path',
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { currentSection, setCurrentSection } = useAdmin();
  const pathname = usePathname();
  const strings = useStrings();

  // Build sidebar items with translated labels
  const sidebarItems = sidebarItemsConfig.map(item => ({
    ...item,
    label: strings.navigation?.admin?.[item.labelKey]?.label || 
           (item.labelKey === 'debug' ? 'Debug Tools' : 
            item.labelKey === 'snakePath' ? 'Snake Path' : 
            item.labelKey === 'analytics' ? 'Analytics' : 
            item.labelKey === 'achievements' ? 'Achievements' : item.labelKey),
    icon: strings.navigation?.admin?.[item.labelKey]?.icon || 
          (item.labelKey === 'debug' ? '🐛' : 
           item.labelKey === 'snakePath' ? '🐍' : 
           item.labelKey === 'analytics' ? '📊' : 
           item.labelKey === 'achievements' ? '🏆' : '📋'),
  }));

  const handleSectionClick = (section: AdminSection) => {
    setCurrentSection(section);
    onClose(); // Close mobile sidebar
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-50 w-64 bg-card border-r border-border
          transform transition-transform duration-200 ease-in-out md:transform-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <img 
                  src="/flat-icons/ui/navbar/dashboard.svg" 
                  alt="Admin Dashboard" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">{strings.admin?.title || 'Admin'}</h1>
                <p className="text-sm text-muted-foreground">{strings.appName || 'Doshi Sensei'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="p-4">
              <ul className="space-y-2">
              {/* Home Link */}
              <li>
                <Link
                  href="/"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <span className="text-lg">🏠</span>
                  <span className="font-medium">Home</span>
                </Link>
              </li>
              {/* Divider */}
              <li className="pt-2 pb-1">
                <div className="h-px bg-border"></div>
              </li>
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.id !== 'dashboard' && pathname.startsWith(item.href));

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => handleSectionClick(item.id)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                        ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      `}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>{strings.appName || 'Doshi Sensei'} v1.0.0</p>
              <p>Admin Dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}