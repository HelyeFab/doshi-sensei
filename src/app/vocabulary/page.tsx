import { Metadata } from 'next';
import VocabularyClient from './VocabularyClient';

export const metadata: Metadata = {
  title: 'Vocabulary Search & Study Lists',
  description: 'Search Japanese vocabulary with WaniKani/Jisho or offline JMdict. Save words and example sentences to custom study lists. Practice with flashcards and track your progress.',
  keywords: [
    'Japanese vocabulary',
    'Jisho search',
    'WaniKani integration',
    'JMdict offline',
    'vocabulary lists',
    'study lists',
    'Japanese flashcards',
    'example sentences',
    'vocabulary builder',
    'Japanese dictionary',
    'word search',
    'kanji lookup'
  ],
  openGraph: {
    title: 'Vocabulary Search & Study Lists | Doshi Sensei',
    description: 'Search Japanese vocabulary with WaniKani/Jisho or offline JMdict. Save words and example sentences to custom study lists.',
    type: 'website',
  },
  alternates: {
    canonical: '/vocabulary',
  },
};

const vocabularyStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Japanese Vocabulary Search - Doshi Sensei",
  "description": "Search and study Japanese vocabulary with multiple dictionaries, create custom study lists, and practice with flashcards.",
  "url": "https://doshisensei.com/vocabulary",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://doshisensei.com/vocabulary?search={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function VocabularyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(vocabularyStructuredData),
        }}
      />
      <VocabularyClient />
    </>
  );
}