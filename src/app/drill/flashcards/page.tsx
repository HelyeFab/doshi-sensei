import { Metadata } from 'next';
import FlashcardReviewClient from './FlashcardReviewClient';
import StructuredData from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Flashcards | Doshi Sensei',
  description: 'Flashcards - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  openGraph: {
    title: 'Flashcards | Doshi Sensei',
    description: 'Flashcards - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
    type: 'website',
    url: 'https://doshisensei.com/drill/flashcards',
  },
  twitter: {
    card: 'summary',
    title: 'Flashcards | Doshi Sensei',
    description: 'Flashcards - Part of Doshi Sensei\'s comprehensive Japanese learning platform.',
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Flashcards - Doshi Sensei",
  "description": "Flashcards - Part of Doshi Sensei's comprehensive Japanese learning platform.",
  "url": "https://doshisensei.com/drill/flashcards",
  "isPartOf": {
    "@type": "WebApplication",
    "@id": "https://doshisensei.com/#application"
  }
};

export default function FlashcardReviewPage() {
  return (
    <>
      <StructuredData data={structuredData} />
      <FlashcardReviewClient />
    </>
  );
}