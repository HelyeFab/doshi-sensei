import { Metadata } from 'next';
import TestSimpleAI from './TestSimpleAI';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Simple AI Test | Doshi Sensei',
  description: 'Simple AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Simple AI Test | Doshi Sensei',
    description: 'Simple AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-simple-ai',
  },
  twitter: {
    card: 'summary',
    title: 'Simple AI Test | Doshi Sensei',
    description: 'Simple AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Simple AI Test - Doshi Sensei",
  "description": "Simple AI Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-simple-ai",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestSimpleAI() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestSimpleAI />
    </>
  );
}