import type { Metadata } from 'next';
import PracticeClient from './PracticeClient';

export const metadata: Metadata = {
  title: 'Practice | Doshi Sensei',
  description: 'Practice Japanese with interactive exercises including hiragana, katakana, kanji, verb conjugation, and vocabulary drills.',
  keywords: ['Japanese practice', 'hiragana', 'katakana', 'kanji practice', 'verb conjugation', 'Japanese drills'],
  openGraph: {
    title: 'Practice Japanese | Doshi Sensei',
    description: 'Master Japanese with comprehensive practice tools for hiragana, katakana, kanji, and grammar.',
    url: 'https://doshisensei.com/practice',
  },
};

// Structured Data for Practice Page
const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese Practice Tools",
  "description": "Comprehensive collection of Japanese language practice tools and exercises",
  "url": "https://doshisensei.com/practice",
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "LearningResource",
        "position": 1,
        "name": "Hiragana Practice",
        "url": "https://doshisensei.com/practice/hiragana"
      },
      {
        "@type": "LearningResource",
        "position": 2,
        "name": "Katakana Practice",
        "url": "https://doshisensei.com/practice/katakana"
      }
    ]
  }
};

export default function PracticePage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(practiceStructuredData),
        }}
      />
      <PracticeClient />
    </>
  );
}