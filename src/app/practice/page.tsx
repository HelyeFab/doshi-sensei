import { Metadata } from 'next';
import PracticeClient from './PracticeClient';

export const metadata: Metadata = {
  title: 'Japanese Practice Hub',
  description: 'Practice Japanese with various exercises: hiragana, katakana, verb conjugations, and flashcards. Choose from beginner to advanced practice modes tailored to your learning level.',
  keywords: [
    'Japanese practice',
    'hiragana practice',
    'katakana practice',
    'kana practice',
    'verb conjugation practice',
    'Japanese drills',
    'Japanese exercises',
    'flashcard practice',
    'spaced repetition',
    'Japanese learning exercises',
    'JLPT practice',
    'beginner Japanese practice',
    'intermediate Japanese practice'
  ],
  openGraph: {
    title: 'Japanese Practice Hub | Doshi Sensei',
    description: 'Practice Japanese with various exercises: hiragana, katakana, verb conjugations, and flashcards.',
    type: 'website',
  },
  alternates: {
    canonical: '/practice',
  },
};

const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese Practice Hub - Doshi Sensei",
  "description": "A collection of Japanese practice exercises organized by skill level and type.",
  "url": "https://doshisensei.com/practice",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "hasPart": [
    {
      "@type": "LearningResource",
      "name": "Hiragana Practice",
      "educationalLevel": "Beginner",
      "learningResourceType": "Exercise",
      "url": "https://doshisensei.com/practice/hiragana"
    },
    {
      "@type": "LearningResource",
      "name": "Katakana Practice",
      "educationalLevel": "Beginner",
      "learningResourceType": "Exercise",
      "url": "https://doshisensei.com/practice/katakana"
    },
    {
      "@type": "LearningResource",
      "name": "Verb Conjugation Practice",
      "educationalLevel": "Intermediate",
      "learningResourceType": "Exercise",
      "url": "https://doshisensei.com/practice/conjugation"
    },
    {
      "@type": "LearningResource",
      "name": "Flashcard Practice",
      "educationalLevel": "All Levels",
      "learningResourceType": "Exercise",
      "url": "https://doshisensei.com/drill/flashcards"
    }
  ]
};

export default function PracticePage() {
  return (
    <>
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