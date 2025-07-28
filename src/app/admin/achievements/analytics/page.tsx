import { Metadata } from 'next';
import AchievementAnalyticsClient from './AchievementAnalyticsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Analytics | Doshi Sensei',
  description: 'Analytics - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Analytics | Doshi Sensei',
    description: 'Analytics - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/achievements/analytics',
  },
  twitter: {
    card: 'summary',
    title: 'Analytics | Doshi Sensei',
    description: 'Analytics - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Analytics - Doshi Sensei",
  "description": "Analytics - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/achievements/analytics",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AchievementAnalyticsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AchievementAnalyticsClient />
    </>
  );
}