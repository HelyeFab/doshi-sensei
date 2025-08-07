'use client';

import dynamic from 'next/dynamic';

// Dynamically import SettingsPage with no SSR to avoid build errors
const SettingsPage = dynamic(() => import('./SettingsPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function SettingsWrapper() {
  return <SettingsPage />;
}