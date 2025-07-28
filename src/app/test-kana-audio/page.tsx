import { Metadata } from 'next';
import TestKanaAudio from './TestKanaAudio';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Kana Audio Test | Doshi Sensei',
  description: 'Kana Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Kana Audio Test | Doshi Sensei',
    description: 'Kana Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/test-kana-audio',
  },
  twitter: {
    card: 'summary',
    title: 'Kana Audio Test | Doshi Sensei',
    description: 'Kana Audio Test - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Kana Audio Test - Doshi Sensei",
  "description": "Kana Audio Test - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/test-kana-audio",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function TestKanaAudio() {
  return (
    <>
      <StructuredData data={structuredData} />
      <TestKanaAudio />
    </>
  );
}