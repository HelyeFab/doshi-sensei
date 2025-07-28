import { Metadata } from 'next';
import ThreePillarIntegrationTestClient from './ThreePillarIntegrationTestClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Three Pillar Integration Test | Doshi Sensei',
  description: 'Three Pillar Integration Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Three Pillar Integration Test | Doshi Sensei',
    description: 'Three Pillar Integration Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-three-pillar-integration',
  },
  twitter: {
    card: 'summary',
    title: 'Three Pillar Integration Test | Doshi Sensei',
    description: 'Three Pillar Integration Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Three Pillar Integration Test - Doshi Sensei",
  "description": "Three Pillar Integration Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-three-pillar-integration",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ThreePillarIntegrationTestPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ThreePillarIntegrationTestClient />
    </>
  );
}