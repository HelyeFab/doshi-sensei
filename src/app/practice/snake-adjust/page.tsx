import { Metadata } from 'next';
import SnakeAdjustClient from './SnakeAdjustClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Snake Adjust | Doshi Sensei',
  description: 'Snake Adjust - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Snake Adjust | Doshi Sensei',
    description: 'Snake Adjust - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/practice/snake-adjust',
  },
  twitter: {
    card: 'summary',
    title: 'Snake Adjust | Doshi Sensei',
    description: 'Snake Adjust - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Snake Adjust - Doshi Sensei",
  "description": "Snake Adjust - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/practice/snake-adjust",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function SnakeAdjustPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <SnakeAdjustClient />
    </>
  );
}