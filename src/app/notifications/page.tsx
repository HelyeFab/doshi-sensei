import { Metadata } from 'next';
import NotificationsClient from './NotificationsClient';

export const metadata: Metadata = {
  title: 'Notifications | Doshi Sensei',
  description: 'View all your notifications and updates from Doshi Sensei.',
  openGraph: {
    title: 'Notifications | Doshi Sensei',
    description: 'Stay updated with your learning progress and announcements.',
  },
  robots: 'noindex, nofollow',
};

export default function NotificationsPage() {
  return <NotificationsClient />;
}