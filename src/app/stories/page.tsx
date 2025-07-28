import { Metadata } from 'next';
import StoriesClient from './StoriesClient';

export const metadata: Metadata = {
  title: 'Japanese Stories - Graded Reading Practice',
  description: 'Read engaging Japanese stories tailored to your JLPT level. Practice reading comprehension with AI-generated stories featuring furigana, vocabulary highlights, and grammar explanations. Available offline for learning anywhere.',
  keywords: [
    'Japanese stories',
    'graded readers',
    'JLPT reading practice',
    'Japanese reading comprehension',
    'AI Japanese stories',
    'beginner Japanese stories',
    'intermediate Japanese stories',
    'advanced Japanese stories',
    'Japanese story collection',
    'offline Japanese reading',
    'furigana stories',
    'Japanese learning stories'
  ],
  openGraph: {
    title: 'Japanese Stories - Graded Reading Practice | Doshi Sensei',
    description: 'Read engaging Japanese stories tailored to your JLPT level. Practice reading comprehension with AI-generated stories.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Japanese Stories - Graded Reading Practice | Doshi Sensei',
    description: 'Read engaging Japanese stories tailored to your JLPT level. Practice reading comprehension with AI-generated stories.',
  },
  alternates: {
    canonical: '/stories',
  },
};

const storiesStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese Stories Collection - Doshi Sensei",
  "description": "A collection of graded Japanese stories for language learners at all JLPT levels.",
  "url": "https://doshisensei.com/stories",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "hasPart": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "EducationalMaterial",
        "name": "Beginner Japanese Stories",
        "educationalLevel": "JLPT N5-N4",
        "learningResourceType": "Reading Material"
      },
      {
        "@type": "EducationalMaterial", 
        "name": "Intermediate Japanese Stories",
        "educationalLevel": "JLPT N3-N2",
        "learningResourceType": "Reading Material"
      },
      {
        "@type": "EducationalMaterial",
        "name": "Advanced Japanese Stories", 
        "educationalLevel": "JLPT N1",
        "learningResourceType": "Reading Material"
      }
    ]
  }
};

export default function StoriesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(storiesStructuredData),
        }}
      />
      <StoriesClient />
    </>
  );
}