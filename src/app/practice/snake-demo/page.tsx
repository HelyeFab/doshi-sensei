import { Metadata } from 'next';
import SnakeDemoClient from './SnakeDemoClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Snake Demo | Doshi Sensei',
  description: 'Snake Demo - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Snake Demo | Doshi Sensei',
    description: 'Snake Demo - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/practice/snake-demo',
  },
  twitter: {
    card: 'summary',
    title: 'Snake Demo | Doshi Sensei',
    description: 'Snake Demo - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Snake Demo - Doshi Sensei",
  "description": "Snake Demo - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/practice/snake-demo",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function SnakeDemoPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <SnakeDemoClient />
    </>
  );
}