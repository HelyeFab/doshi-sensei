'use client';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { AchievementAnalytics } from '@/components/achievements/admin/AchievementAnalytics';

export default function AchievementAnalyticsClient() {
  return (
    <AdminLayout title="Achievement Analytics">
      <AchievementAnalytics />
    </AdminLayout>
  );
}