import { Metadata } from 'next';
import KanaClient from './KanaClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Kana | Doshi Sensei',
  description: 'Kana - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Kana | Doshi Sensei',
    description: 'Kana - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/practice/kana',
  },
  twitter: {
    card: 'summary',
    title: 'Kana | Doshi Sensei',
    description: 'Kana - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Kana - Doshi Sensei",
  "description": "Kana - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/practice/kana",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function KanaPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <KanaClient />
    </>
  );
}