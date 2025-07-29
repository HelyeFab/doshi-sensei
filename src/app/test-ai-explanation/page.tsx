import { Metadata } from 'next';
import TestAIExplanationClient from './TestAIExplanation';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'AI Explanation Test | Doshi Sensei',
  description: 'AI Explanation Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'AI Explanation Test | Doshi Sensei',
    description: 'AI Explanation Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-ai-explanation',
  },
  twitter: {
    card: 'summary',
    title: 'AI Explanation Test | Doshi Sensei',
    description: 'AI Explanation Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "AI Explanation Test - Doshi Sensei",
  "description": "AI Explanation Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-ai-explanation",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestAIExplanationPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestAIExplanationClient />
    </>
  );
}