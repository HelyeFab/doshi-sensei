import { Metadata } from 'next';
import TestAudioClient from './TestAudioClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Audio Test | Doshi Sensei',
  description: 'Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Audio Test | Doshi Sensei',
    description: 'Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-audio',
  },
  twitter: {
    card: 'summary',
    title: 'Audio Test | Doshi Sensei',
    description: 'Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Audio Test - Doshi Sensei",
  "description": "Audio Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-audio",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestAudioPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestAudioClient />
    </>
  );
}