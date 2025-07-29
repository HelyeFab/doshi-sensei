import { Metadata } from 'next';
import TestMinimalAI from './TestMinimalAI';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Minimal AI Test | Doshi Sensei',
  description: 'Minimal AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Minimal AI Test | Doshi Sensei',
    description: 'Minimal AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-minimal-ai',
  },
  twitter: {
    card: 'summary',
    title: 'Minimal AI Test | Doshi Sensei',
    description: 'Minimal AI Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Minimal AI Test - Doshi Sensei",
  "description": "Minimal AI Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-minimal-ai",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestMinimalAIPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestMinimalAI />
    </>
  );
}