import type { Metadata } from 'next';
import SubscriptionFeaturesClient from './SubscriptionFeaturesClient';

export const metadata: Metadata = {
  title: 'Subscription Features - Admin Dashboard',
  description: 'Manage subscription plans and features',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SubscriptionFeaturesPage() {
  return <SubscriptionFeaturesClient />;
}