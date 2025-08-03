import { Metadata } from 'next';
import NotificationAnalyticsClient from './NotificationAnalyticsClient';

export const metadata: Metadata = {
  title: 'Admin - Notification Analytics | Doshi Sensei',
  description: 'Monitor and analyze push notification performance, engagement metrics, and user preferences.',
  openGraph: {
    title: 'Admin - Notification Analytics | Doshi Sensei',
    description: 'Notification analytics dashboard for administrators.',
  },
  robots: 'noindex, nofollow',
};

export default function NotificationAnalyticsPage() {
  return <NotificationAnalyticsClient />;
}