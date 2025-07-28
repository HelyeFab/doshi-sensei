import { Metadata } from 'next';
import TestEvictionClient from './TestEvictionClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Eviction Test | Doshi Sensei',
  description: 'Eviction Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Eviction Test | Doshi Sensei',
    description: 'Eviction Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-eviction',
  },
  twitter: {
    card: 'summary',
    title: 'Eviction Test | Doshi Sensei',
    description: 'Eviction Test - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Eviction Test - Doshi Sensei",
  "description": "Eviction Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-eviction",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestEvictionPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestEvictionClient />
    </>
  );
}