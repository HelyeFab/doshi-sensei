import { Metadata } from 'next';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
  },
  description: 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
  keywords: [
    'Japanese learning platform',
    'Japanese verb conjugation',
    'JLPT kanji study',
    'kanji mood boards',
    'Jisho vocabulary',
    'WaniKani integration',
    'Anki deck import',
    'Japanese flashcards',
    'YouTube shadowing practice',
    'Japanese news reading',
    'AI Japanese stories',
    'Japanese learning games',
    'Japanese grammar resources',
    'hiragana katakana practice',
    'spaced repetition Japanese',
    'comprehensive Japanese study',
    'Japanese language app',
    'learn Japanese online',
    'Japanese drill practice',
    'Japanese vocabulary builder'
  ],
  openGraph: {
    title: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    description: 'The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.',
    type: 'website',
    url: 'https://doshisensei.com',
    images: [
      {
        url: '/doshi.png',
        width: 1200,
        height: 630,
        alt: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doshi Sensei - The Ultimate Japanese Learning Platform',
    description: 'Master Japanese with comprehensive tools: verb conjugations, kanji study, vocabulary practice, YouTube shadowing, AI stories, and more!',
    images: ['/doshi.png'],
    creator: '@doshisensei',
    site: '@doshisensei',
  },
  alternates: {
    canonical: '/',
  },
};

const homeStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Doshi Sensei",
  "description": "The ultimate Japanese learning platform: Master verb conjugations, study kanji through JLPT levels and mood boards, practice with Jisho/WaniKani vocabulary, import Anki decks, read news articles and AI stories, practice YouTube shadowing, play learning games, access grammar resources, and build fluency with our comprehensive suite of interactive tools.",
  "url": "https://doshisensei.com",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Organization",
    "name": "Doshi Sensei Team"
  },
  "applicationSubCategory": "Language Learning",
  "featureList": [
    "Japanese verb conjugation practice",
    "JLPT kanji study by level",
    "Kanji mood boards for thematic learning",
    "Jisho/WaniKani vocabulary integration",
    "Anki deck import and export",
    "YouTube video shadowing practice",
    "AI-generated Japanese stories",
    "Japanese news reading practice",
    "Interactive learning games",
    "Textbook vocabulary (Genki/Minna no Nihongo)",
    "Spaced repetition flashcards",
    "Offline learning support",
    "Progress tracking and achievements",
    "Grammar explanations and resources"
  ],
  "screenshot": [
    {
      "@type": "ImageObject",
      "url": "https://doshisensei.com/screenshot-home.png",
      "caption": "Doshi Sensei home screen"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1250"
  }
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeStructuredData),
        }}
      />
      <HomeClient />
    </>
  );
}