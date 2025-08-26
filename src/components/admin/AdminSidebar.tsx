'use client';

import { useAdmin } from '@/contexts/AdminContext';
import { AdminSection } from '@/types/admin';
import { usePathname } from 'next/navigation';
import Link from 'next/link'
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { useStrings } from '@/contexts/LanguageContext';

interface SidebarItem {
  id: AdminSection;
  labelKey: string;
  iconKey: string;
  href: string;
}

// Define categories
interface SidebarCategory {
  label: string;
  items: Omit<SidebarItem, 'label' | 'icon'>[];
}

// Define the structure without calling hooks
const sidebarCategories: SidebarCategory[] = [
  {
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        labelKey: 'dashboard',
        iconKey: 'dashboard',
        href: '/admin',
      },
    ]
  },
  {
    label: 'User Management',
    items: [
      {
        id: 'users',
        labelKey: 'users',
        iconKey: 'users',
        href: '/admin/users',
      },
      {
        id: 'user-entitlements' as AdminSection,
        labelKey: 'userEntitlements',
        iconKey: 'userEntitlements',
        href: '/admin/user-entitlements',
      },
      {
        id: 'features' as AdminSection,
        labelKey: 'features',
        iconKey: 'features',
        href: '/admin/features',
      },
    ]
  },
  {
    label: 'Content Management',
    items: [
      {
        id: 'blog' as AdminSection,
        labelKey: 'blog',
        iconKey: 'blog',
        href: '/admin/blog',
      },
      {
        id: 'media' as AdminSection,
        labelKey: 'media',
        iconKey: 'media',
        href: '/admin/media',
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
        id: 'youtube-series' as AdminSection,
        labelKey: 'youtubeSeries',
        iconKey: 'youtubeSeries',
        href: '/admin/youtube-series',
      },
    ]
  },
  {
    label: 'Analytics & Monitoring',
    items: [
      {
        id: 'security' as AdminSection,
        labelKey: 'security',
        iconKey: 'security',
        href: '/admin/security',
      },
      {
        id: 'analytics' as AdminSection,
        labelKey: 'analytics',
        iconKey: 'analytics',
        href: '/admin/analytics',
      },
      {
        id: 'payment-monitor' as AdminSection,
        labelKey: 'paymentMonitor',
        iconKey: 'paymentMonitor',
        href: '/admin/payment-monitor',
      },
      {
        id: 'kpi-dashboard' as AdminSection,
        labelKey: 'kpiDashboard',
        iconKey: 'kpiDashboard',
        href: '/admin/kpi-dashboard',
      },
      {
        id: 'api-monitor' as AdminSection,
        labelKey: 'apiMonitor',
        iconKey: 'apiMonitor',
        href: '/admin/api-monitor',
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
        id: 'notifications' as AdminSection,
        labelKey: 'notifications',
        iconKey: 'notifications',
        href: '/admin/notifications',
      },
      {
        id: 'bugs' as AdminSection,
        labelKey: 'bugs',
        iconKey: 'bugs',
        href: '/admin/bugs',
      },
    ]
  },
  {
    label: 'System Tools',
    items: [
      {
        id: 'achievements' as AdminSection,
        labelKey: 'achievements',
        iconKey: 'achievements',
        href: '/admin/achievements',
      },
      {
        id: 'mockup-generator' as AdminSection,
        labelKey: 'mockupGenerator',
        iconKey: 'mockupGenerator',
        href: '/admin/mockup-generator',
      },
      {
        id: 'debug' as AdminSection,
        labelKey: 'debug',
        iconKey: 'debug',
        href: '/admin/debug',
      },
      {
        id: 'console-monitor' as AdminSection,
        labelKey: 'consoleMonitor',
        iconKey: 'consoleMonitor',
        href: '/admin/console-monitor',
      },
    ]
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

  // Helper to get translated label for an item
  const getItemLabel = (labelKey: string) => {
    return strings.navigation?.admin?.[labelKey]?.label || 
           (labelKey === 'security' ? 'Security Monitor' :
            labelKey === 'blog' ? 'Blog' :
            labelKey === 'media' ? 'Media Library' :
            labelKey === 'debug' ? 'Debug Tools' : 
            labelKey === 'snakePath' ? 'Snake Path' : 
            labelKey === 'analytics' ? 'Analytics' : 
            labelKey === 'paymentMonitor' ? 'Payment Monitor' :
            labelKey === 'kpiDashboard' ? 'KPI Dashboard' : 
            labelKey === 'apiMonitor' ? 'API Monitor' :
            labelKey === 'achievements' ? 'Achievements' : 
            labelKey === 'userEntitlements' ? 'User Entitlements' : 
            labelKey === 'articles' ? 'Articles' : 
            labelKey === 'moodBoards' ? 'Mood Boards' : 
            labelKey === 'logs' ? 'Activity Logs' :
            labelKey === 'activities' ? 'Activities' : 
            labelKey === 'notifications' ? 'Notifications' : 
            labelKey === 'bugs' ? 'Bug Reports' : 
            labelKey === 'youtubeSeries' ? 'YouTube Series' :
            labelKey === 'mockupGenerator' ? 'Mockup Generator' :
            labelKey === 'consoleMonitor' ? 'Console Monitor' : labelKey);
  };

  // Helper to get icon for an item
  const getItemIcon = (iconKey: string) => {
    return strings.navigation?.admin?.[iconKey]?.icon || 
          (iconKey === 'security' ? '🛡️' :
           iconKey === 'blog' ? '📰' :
           iconKey === 'media' ? '🖼️' :
           iconKey === 'debug' ? '🐛' : 
           iconKey === 'snakePath' ? '🐍' : 
           iconKey === 'analytics' ? '📊' : 
           iconKey === 'paymentMonitor' ? '💳' :
           iconKey === 'kpiDashboard' ? '📈' : 
           iconKey === 'apiMonitor' ? '🔌' :
           iconKey === 'achievements' ? '🏆' : 
           iconKey === 'userEntitlements' ? '🔐' : 
           iconKey === 'articles' ? '📄' : 
           iconKey === 'moodBoards' ? '🎨' : 
           iconKey === 'logs' ? '📝' :
           iconKey === 'activities' ? '📊' : 
           iconKey === 'notifications' ? '🔔' : 
           iconKey === 'bugs' ? '🐛' : 
           iconKey === 'youtubeSeries' ? '📺' :
           iconKey === 'mockupGenerator' ? '🎨' :
           iconKey === 'consoleMonitor' ? '💻' : '📋');
  };

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
                <SmartNavigationLink href="/"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                 title="Navigation">
                  <span className="text-lg">🏠</span>
                  <span className="font-medium">Home</span>
                </SmartNavigationLink>
              </li>
              {/* Divider */}
              <li className="pt-2 pb-1">
                <div className="h-px bg-border"></div>
              </li>
              {sidebarCategories.map((category, categoryIndex) => (
                <div key={category.label}>
                  {/* Category header */}
                  <li className="px-3 pt-4 pb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category.label}
                    </span>
                  </li>
                  
                  {/* Category items */}
                  {category.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.id !== 'dashboard' && pathname.startsWith(item.href));

                    return (
                      <li key={item.id}>
                        <SmartNavigationLink 
                          href={item.href}
                          title={getItemLabel(item.labelKey)}
                          onClick={() => handleSectionClick(item.id)}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                            ${isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }
                          `}
                        >
                          <span className="text-lg">{getItemIcon(item.iconKey)}</span>
                          <span className="font-medium">{getItemLabel(item.labelKey)}</span>
                        </SmartNavigationLink>
                      </li>
                    );
                  })}
                  
                  {/* Add separator between categories except after the last one */}
                  {categoryIndex < sidebarCategories.length - 1 && (
                    <li className="pt-2 pb-1">
                      <div className="h-px bg-border mx-3"></div>
                    </li>
                  )}
                </div>
              ))}
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