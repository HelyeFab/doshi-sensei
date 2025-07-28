import { Metadata } from 'next';
import TestCacheClient from './TestCacheClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Cache Test | Doshi Sensei',
  description: 'Cache Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Cache Test | Doshi Sensei',
    description: 'Cache Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-cache',
  },
  twitter: {
    card: 'summary',
    title: 'Cache Test | Doshi Sensei',
    description: 'Cache Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Cache Test - Doshi Sensei",
  "description": "Cache Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-cache",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestCachePage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestCacheClient />
    </>
  );
}