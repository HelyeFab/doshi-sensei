import { Metadata } from 'next';
import ContentAnalyticsClient from './ContentAnalyticsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Content | Doshi Sensei',
  description: 'Content - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Content | Doshi Sensei',
    description: 'Content - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/analytics/content',
  },
  twitter: {
    card: 'summary',
    title: 'Content | Doshi Sensei',
    description: 'Content - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Content - Doshi Sensei",
  "description": "Content - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/analytics/content",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ContentAnalyticsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ContentAnalyticsClient />
    </>
  );
}