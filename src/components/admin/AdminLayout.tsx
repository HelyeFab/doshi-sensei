'use client';

import { useState, useEffect } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { NotificationProvider } from './AdminNotifications';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

interface AdminLayoutProps {
  title?: string;
  children: React.ReactNode;
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setSidebarOpen(true);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };



  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - Always shown */}
          <AdminHeader onMenuClick={handleMenuClick} title={title || ''} />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <MobileAwareContainer className="p-4 sm:p-6 max-w-full overflow-hidden" extraPadding={40}>
              {children}
            </MobileAwareContainer>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
