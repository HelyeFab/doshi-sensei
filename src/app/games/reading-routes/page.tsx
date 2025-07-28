import { Metadata } from 'next';
import ReadingRoutesClient from './ReadingRoutesClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Reading Routes | Doshi Sensei',
  description: 'Reading Routes - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Reading Routes | Doshi Sensei',
    description: 'Reading Routes - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/games/reading-routes',
  },
  twitter: {
    card: 'summary',
    title: 'Reading Routes | Doshi Sensei',
    description: 'Reading Routes - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Reading Routes - Doshi Sensei",
  "description": "Reading Routes - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/games/reading-routes",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ReadingRoutesPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ReadingRoutesClient />
    </>
  );
}