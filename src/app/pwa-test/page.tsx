import { Metadata } from 'next';
import PWATestClient from './PWATestClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'PWA Test | Doshi Sensei',
  description: 'PWA Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'PWA Test | Doshi Sensei',
    description: 'PWA Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/pwa-test',
  },
  twitter: {
    card: 'summary',
    title: 'PWA Test | Doshi Sensei',
    description: 'PWA Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "PWA Test - Doshi Sensei",
  "description": "PWA Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/pwa-test",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function PWATestPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <PWATestClient />
    </>
  );
}