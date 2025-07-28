import { Metadata } from 'next';
import AccountClient from './AccountClient';

export const metadata: Metadata = {
  title: 'My Account - Manage Your Japanese Learning Profile',
  description: 'Access your Doshi Sensei account to track progress, manage subscriptions, view achievements, and customize your Japanese learning experience.',
  keywords: [
    'Japanese learning account',
    'user profile',
    'learning progress tracking',
    'subscription management',
    'achievement badges',
    'study statistics',
    'account settings',
    'premium membership',
    'learning history',
    'profile customization'
  ],
  openGraph: {
    title: 'My Account | Doshi Sensei',
    description: 'Manage your Japanese learning profile, track progress, and customize your study experience.',
    type: 'website',
  },
  robots: {
    index: false, // Account pages shouldn't be indexed
    follow: false,
  },
  alternates: {
    canonical: '/account',
  },
};

export default function AccountPage() {
  return <AccountClient />;
}