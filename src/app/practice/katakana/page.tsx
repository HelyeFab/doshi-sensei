import { Metadata } from 'next';
import KatakanaClient from './KatakanaClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Katakana | Doshi Sensei',
  description: 'Learn katakana characters through engaging practice drills and memory aids.',
  openGraph: {
    title: 'Katakana | Doshi Sensei',
    description: 'Learn katakana characters through engaging practice drills and memory aids.',
    type: 'website',
    url: 'https://doshisensei.com/practice/katakana',
  },
  twitter: {
    card: 'summary',
    title: 'Katakana | Doshi Sensei',
    description: 'Learn katakana characters through engaging practice drills and memory aids.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Katakana - Doshi Sensei",
  "description": "Learn katakana characters through engaging practice drills and memory aids.",
  "url": "https://doshisensei.com/practice/katakana",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function KatakanaPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <KatakanaClient />
    </>
  );
}