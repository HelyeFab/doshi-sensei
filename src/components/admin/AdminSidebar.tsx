'use client';

import { useAdmin } from '@/contexts/AdminContext';
import { AdminSection } from '@/types/admin';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface SidebarItem {
  id: AdminSection;
  label: string;
  icon: string;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    href: '/admin',
  },
  {
    id: 'users',
    label: 'Users',
    icon: '👥',
    href: '/admin/users',
  },
  {
    id: 'mood-boards',
    label: 'Mood Boards',
    icon: '🎨',
    href: '/admin/mood-boards',
  },
  {
    id: 'logs',
    label: 'Activity Logs',
    icon: '📝',
    href: '/admin/logs',
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { currentSection, setCurrentSection } = useAdmin();
  const pathname = usePathname();

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
              <div className="text-2xl">🎯</div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Admin</h1>
                <p className="text-sm text-muted-foreground">Doshi Sensei</p>
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
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
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
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <p>Admin Dashboard v1.0</p>
              <p>Branch: feature/admin-dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
