import { Metadata } from 'next';
import ReadClient from './ReadClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Read | Doshi Sensei',
  description: 'Read - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Read | Doshi Sensei',
    description: 'Read - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/read',
  },
  twitter: {
    card: 'summary',
    title: 'Read | Doshi Sensei',
    description: 'Read - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Read - Doshi Sensei",
  "description": "Read - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/read",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function ReadPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <ReadClient />
    </>
  );
}