import { Metadata } from 'next';
import TestShadowingClient from './TestShadowingClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Shadowing Test | Doshi Sensei',
  description: 'Shadowing Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Shadowing Test | Doshi Sensei',
    description: 'Shadowing Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-shadowing',
  },
  twitter: {
    card: 'summary',
    title: 'Shadowing Test | Doshi Sensei',
    description: 'Shadowing Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Shadowing Test - Doshi Sensei",
  "description": "Shadowing Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-shadowing",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestShadowingPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestShadowingClient />
    </>
  );
}