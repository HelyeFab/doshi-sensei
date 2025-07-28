import { Metadata } from 'next';
import OfflineClient from './OfflineClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Offline | Doshi Sensei',
  description: 'Offline - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Offline | Doshi Sensei',
    description: 'Offline - Part of Doshi Sensei's comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/offline',
  },
  twitter: {
    card: 'summary',
    title: 'Offline | Doshi Sensei',
    description: 'Offline - Part of Doshi Sensei's comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Offline - Doshi Sensei",
  "description": "Offline - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/offline",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function OfflinePage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <OfflineClient />
    </>
  );
}