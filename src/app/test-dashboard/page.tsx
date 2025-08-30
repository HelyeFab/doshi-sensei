'use client';

import WeeklyActivityDashboard from '@/components/dashboard/WeeklyActivityDashboard';
import { AuthProvider } from '@/contexts/AuthContext';

export default function TestDashboard() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">Activity Dashboard Test</h1>
        <WeeklyActivityDashboard />
      </div>
    </AuthProvider>
  );
}