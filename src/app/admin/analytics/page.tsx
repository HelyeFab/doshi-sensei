import { Metadata } from 'next';
import AnalyticsOverview from './AnalyticsOverview';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Analytics | Doshi Sensei',
  description: 'Analytics - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Analytics | Doshi Sensei',
    description: 'Analytics - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/analytics',
  },
  twitter: {
    card: 'summary',
    title: 'Analytics | Doshi Sensei',
    description: 'Analytics - Part of Doshi Sensei's comprehensive Japanese learning platform.',
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
  "url": "https://doshisensei.com/admin/analytics",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function AnalyticsOverview() {
  return (
    <>
      <StructuredData data={structuredData} />
      <AnalyticsOverview />
    </>
  );
}