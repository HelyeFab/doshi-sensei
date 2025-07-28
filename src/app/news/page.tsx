import { Metadata } from 'next';
import NewsClient from './NewsClient';

export const metadata: Metadata = {
  title: 'Japanese News Reading Practice',
  description: 'Read real Japanese news articles adapted for language learners. Practice reading comprehension with articles categorized by difficulty level and topic. Improve your Japanese through current events.',
  keywords: [
    'Japanese news',
    'Japanese reading practice',
    'Japanese current events',
    'NHK news Japanese',
    'Japanese articles',
    'reading comprehension',
    'Japanese news for learners',
    'beginner Japanese news',
    'intermediate Japanese news',
    'advanced Japanese news',
    'Japanese news with furigana',
    'Japanese news translation',
    'daily Japanese practice'
  ],
  openGraph: {
    title: 'Japanese News Reading Practice | Doshi Sensei',
    description: 'Read real Japanese news articles adapted for language learners. Practice reading comprehension with current events.',
    type: 'website',
  },
  alternates: {
    canonical: '/news',
  },
};

const newsStructuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Japanese News Reading Practice - Doshi Sensei",
  "description": "A collection of Japanese news articles adapted for language learners at different levels.",
  "url": "https://doshisensei.com/news",
  "isPartOf": {
    "@type": "WebApplication",
    "name": "Doshi Sensei"
  },
  "about": {
    "@type": "Thing",
    "name": "Japanese Language News",
    "description": "Current events and news articles in Japanese for language learning"
  },
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "News Articles",
  "inLanguage": ["ja", "en"]
};

export default function NewsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(newsStructuredData),
        }}
      />
      <NewsClient />
    </>
  );
}