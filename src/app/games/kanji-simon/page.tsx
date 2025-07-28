import { Metadata } from 'next';
import KanjiSimonClient from './KanjiSimonClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Kanji Simon | Doshi Sensei',
  description: 'Test your kanji memory with this fun Simon Says-style memory game.',
  openGraph: {
    title: 'Kanji Simon | Doshi Sensei',
    description: 'Test your kanji memory with this fun Simon Says-style memory game.',
    type: 'website',
    url: 'https://doshisensei.com/games/kanji-simon',
  },
  twitter: {
    card: 'summary',
    title: 'Kanji Simon | Doshi Sensei',
    description: 'Test your kanji memory with this fun Simon Says-style memory game.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Kanji Simon - Doshi Sensei",
  "description": "Test your kanji memory with this fun Simon Says-style memory game.",
  "url": "https://doshisensei.com/games/kanji-simon",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function KanjiSimonPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <KanjiSimonClient />
    </>
  );
}