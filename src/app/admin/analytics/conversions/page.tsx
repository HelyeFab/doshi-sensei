import { Metadata } from 'next';
import ConversionAnalyticsClient from './ConversionAnalyticsClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Conversions | Doshi Sensei',
  description: 'Conversions - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Conversions | Doshi Sensei',
    description: 'Conversions - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/admin/analytics/conversions',
  },
  twitter: {
    card: 'summary',
    title: 'Conversions | Doshi Sensei',
    description: 'Conversions - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Conversions - Doshi Sensei",
  "description": "Conversions - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/admin/analytics/conversions",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ConversionAnalyticsPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ConversionAnalyticsClient />
    </>
  );
}